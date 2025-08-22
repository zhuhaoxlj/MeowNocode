import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Upload, Database as DatabaseIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { toast } from 'sonner';

// 从 memos 的 SQLite 数据库中解析 memo 表
async function parseMemosFromSQLite(dbFile) {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  const buffer = new Uint8Array(await dbFile.arrayBuffer());
  const db = new SQL.Database(buffer);

  // 选择需要的字段，过滤正常行
  const query = `
    SELECT id, created_ts, updated_ts, content, payload, pinned, row_status
    FROM memo
    WHERE row_status = 'NORMAL'
    ORDER BY created_ts ASC
  `;

  const result = db.exec(query);
  if (!result || result.length === 0) return [];

  const { columns, values } = result[0];
  const colIdx = Object.fromEntries(columns.map((c, i) => [c, i]));

  const toISO = (seconds) => {
    if (seconds == null) return new Date().toISOString();
    // memos 的 created_ts/updated_ts 为秒级时间戳
    const ms = Number(seconds) * 1000;
    return new Date(ms).toISOString();
  };

  return values.map((row) => {
    const id = row[colIdx.id];
    const created_ts = row[colIdx.created_ts];
    const updated_ts = row[colIdx.updated_ts];
    const content = row[colIdx.content] ?? '';
    const payloadRaw = row[colIdx.payload];
    const pinned = row[colIdx.pinned] ?? 0;

    let tags = [];
    try {
      if (typeof payloadRaw === 'string' && payloadRaw.trim()) {
        const payload = JSON.parse(payloadRaw);
        if (payload && Array.isArray(payload.tags)) tags = payload.tags;
      }
    } catch (_) {
      // 忽略 payload 解析错误
    }
    // 若 payload 未提供标签，则从内容中提取 #tag
    if (!tags || tags.length === 0) {
      try {
        const extracted = [...String(content).matchAll(/(?:^|\s)#([^\s#][\u4e00-\u9fa5a-zA-Z0-9_\/]*)/g)].map((m) => m[1]);
        tags = extracted;
      } catch (_) {}
    }

    const createdAt = toISO(created_ts);
    const updatedAt = toISO(updated_ts ?? created_ts);

    // 统一为本应用的数据结构
    const memoObj = {
      id: `memos-${id}`,
      content,
      tags,
      createdAt,
      updatedAt,
      timestamp: createdAt,
      lastModified: updatedAt,
    };

    return { memoObj, pinned: !!pinned };
  });
}

// 将解析的 memos 合并到本地存储
function mergeMemosIntoLocalStorage(parsed) {
  const existingMemos = JSON.parse(localStorage.getItem('memos') || '[]');
  const existingPinned = JSON.parse(localStorage.getItem('pinnedMemos') || '[]');

  // 兼容 pinned 为「对象数组」或「ID数组」两种存储形态
  const getId = (x) => (x && typeof x === 'object') ? x.id : x;
  const existingIds = new Set(
    [...existingMemos, ...existingPinned]
      .map(getId)
      .filter(Boolean)
      .map(String)
  );

  const imported = [];
  const importedPinned = [];

  for (const { memoObj, pinned } of parsed) {
    if (existingIds.has(String(memoObj.id))) {
      // 跳过重复（来自相同来源的再次导入）
      continue;
    }
    imported.push(memoObj);
    if (pinned) importedPinned.push(memoObj);
  }

  const newMemos = [...existingMemos, ...imported];
  const newPinned = [...existingPinned, ...importedPinned];

  localStorage.setItem('memos', JSON.stringify(newMemos));
  localStorage.setItem('pinnedMemos', JSON.stringify(newPinned));

  // 广播数据变更事件，便于 UI 与云同步感知
  try {
    // 将最近云同步时间重置，避免下行合并把本地导入误判为“云端已删除”
    localStorage.setItem('lastCloudSyncAt', '0');
    // 触发页面刷新本地状态（Index.jsx 监听包含 'restore.' 的事件）
    window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { part: 'restore.import' } }));
  } catch {}

  return { importedCount: imported.length, pinnedCount: importedPinned.length };
}

const ACCEPT_EXTS = ['.db', '.db-wal', '.db-shm'];

export default function MemosImport() {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const handleChoose = () => inputRef.current?.click();

  const validateAndGroup = useCallback((fileList) => {
    const files = Array.from(fileList || []);
    const filtered = files.filter((f) => {
      const name = f.name.toLowerCase();
      return ACCEPT_EXTS.some((ext) => name.endsWith(ext));
    });
    return filtered;
  }, []);

  const onInputChange = (e) => {
    const files = validateAndGroup(e.target.files);
    setSelected(files);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = validateAndGroup(e.dataTransfer.files);
    setSelected(files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const mainDbFile = useMemo(() => {
    const db = selected.find((f) => f.name.toLowerCase().endsWith('.db'));
    return db || null;
  }, [selected]);

  const startImport = async () => {
    if (!mainDbFile) {
      toast.error('请至少选择 .db 文件');
      return;
    }

    try {
      setBusy(true);
      setDone(null);

      // 目前使用 sql.js 直接读取 .db；如果同时提供了 -wal/-shm，我们会接受但不保证未 checkpoint 的事务被包含
      const parsed = await parseMemosFromSQLite(mainDbFile);
  const { importedCount, pinnedCount } = mergeMemosIntoLocalStorage(parsed);
  setDone({ importedCount, pinnedCount });
  toast.success(`导入完成：新增 ${importedCount} 条，置顶 ${pinnedCount} 条。`);
  // 无需强制刷新，通过事件驱动页面感知并刷新本地状态/触发云同步
    } catch (err) {
      console.error(err);
      toast.error(`导入失败：${err.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center">
        <DatabaseIcon className="h-4 w-4 mr-2" />
        从 Memos 导入
      </Label>

      {/* 拖拽/点击选择区域 */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={handleChoose}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_EXTS.join(',')}
          multiple
          className="hidden"
          onChange={onInputChange}
        />

        <div className="space-y-2">
          <Upload className="h-8 w-8 mx-auto text-gray-400" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>拖拽 .db / .db-wal / .db-shm 到此处，或点击选择文件</p>
            <p className="text-xs mt-1">至少需要 .db 文件，建议同时选择 -wal 与 -shm 以保证数据完整</p>
          </div>
        </div>
      </div>

      {/* 已选择文件列表 */}
      {selected.length > 0 && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <div className="mb-2">已选择文件：</div>
          <ul className="list-disc pl-5 space-y-1">
            {selected.map((f) => (
              <li key={f.name}>{f.name} ({Math.round(f.size / 1024)} KB)</li>
            ))}
          </ul>
          {!mainDbFile && (
            <div className="mt-2 flex items-center text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4 mr-1" />
              需要包含 .db 主数据库文件
            </div>
          )}
          {mainDbFile && selected.filter(f => /\.db-wal$/i.test(f.name)).length === 0 && (
            <div className="mt-2 flex items-center text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4 mr-1" />
              未选择对应的 .db-wal 文件，可能导致未提交的更改未被导入
            </div>
          )}
          {mainDbFile && selected.filter(f => /\.db-shm$/i.test(f.name)).length === 0 && (
            <div className="mt-2 flex items-center text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4 mr-1" />
              未选择对应的 .db-shm 文件，建议一并选择以提高完整性
            </div>
          )}

          <div className="mt-3 flex items-center space-x-2">
            <Button size="sm" disabled={!mainDbFile || busy} onClick={startImport}>
              {busy ? '导入中…' : '开始导入'}
            </Button>
            {done && (
              <div className="flex items-center text-green-600 dark:text-green-400 text-xs">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                新增 {done.importedCount} 条，置顶 {done.pinnedCount} 条
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        说明：目前前端解析将直接读取 .db 内容。若存在尚未 checkpoint 的 WAL 记录，可能无法完全包含。建议在来源应用中执行一次完全同步/备份后再导入，以确保完整性。
      </p>
    </div>
  );
}
