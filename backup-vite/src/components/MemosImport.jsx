import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Upload, Database as DatabaseIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { toast } from 'sonner';
import fileStorageService from '@/lib/fileStorageService';

// 从 memos 的 SQLite 数据库中解析 memo 表和 resource 表
async function parseMemosFromSQLite(dbFile) {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  const buffer = new Uint8Array(await dbFile.arrayBuffer());
  const db = new SQL.Database(buffer);

  // 首先获取所有资源数据
  const resourceQuery = `
    SELECT id, uid, filename, blob, type, size, memo_id
    FROM resource
    ORDER BY id ASC
  `;
  
  const resourceResult = db.exec(resourceQuery);
  const resourcesMap = new Map(); // memo_id -> resources[]
  
  if (resourceResult && resourceResult.length > 0) {
    const { columns: resColumns, values: resValues } = resourceResult[0];
    const resColIdx = Object.fromEntries(resColumns.map((c, i) => [c, i]));
    
    for (const resRow of resValues) {
      const memoId = resRow[resColIdx.memo_id];
      const resource = {
        id: resRow[resColIdx.id],
        uid: resRow[resColIdx.uid],
        filename: resRow[resColIdx.filename],
        blob: resRow[resColIdx.blob],
        type: resRow[resColIdx.type],
        size: resRow[resColIdx.size],
      };
      
      if (memoId) {
        if (!resourcesMap.has(memoId)) {
          resourcesMap.set(memoId, []);
        }
        resourcesMap.get(memoId).push(resource);
      }
    }
  }

  // 选择需要的字段，过滤正常行
  const query = `
    SELECT id, created_ts, updated_ts, content, payload, pinned, row_status
    FROM memo
    WHERE row_status = 'NORMAL'
    ORDER BY created_ts ASC
  `;

  const result = db.exec(query);
  if (!result || result.length === 0) return { memos: [], resources: resourcesMap };

  const { columns, values } = result[0];
  const colIdx = Object.fromEntries(columns.map((c, i) => [c, i]));

  const toISO = (seconds) => {
    if (seconds == null) return new Date().toISOString();
    // memos 的 created_ts/updated_ts 为秒级时间戳
    const ms = Number(seconds) * 1000;
    return new Date(ms).toISOString();
  };

  const memos = values.map((row) => {
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

    // 获取关联的资源
    const resources = resourcesMap.get(id) || [];

    // 统一为本应用的数据结构
    const memoObj = {
      id: `memos-${id}`,
      content,
      tags,
      createdAt,
      updatedAt,
      timestamp: createdAt,
      lastModified: updatedAt,
      resources, // 添加资源信息
    };

    return { memoObj, pinned: !!pinned };
  });
  
  return { memos, resources: resourcesMap };
}

// 处理资源文件导入
async function processResourceFiles(memos) {
  const processedMemos = [];
  
  for (const { memoObj, pinned } of memos) {
    if (memoObj.resources && memoObj.resources.length > 0) {
      const processedResources = [];
      let updatedContent = memoObj.content;
      
      // 创建一个映射来存储原始URL到本地引用的对应关系
      const urlMappings = new Map();
      
      for (const resource of memoObj.resources) {
        try {
          if (resource.blob && resource.type && resource.type.startsWith('image/')) {
            // 将 blob 数据转换为 File 对象
            const blob = new Blob([resource.blob], { type: resource.type });
            const file = new File([blob], resource.filename || 'image', { type: resource.type });
            
            // 使用文件存储服务处理文件，强制使用IndexedDB存储大图片
            const fileInfo = await fileStorageService.uploadToIndexedDB(file, { type: 'image' });
            
            console.log('🔍 DEBUG: Original resource data:', {
              uid: resource.uid,
              filename: resource.filename,
              type: resource.type,
              size: resource.size,
              blobSize: resource.blob?.length
            });
            console.log('🔍 DEBUG: Processed file info:', fileInfo);
            
            // 确定文件引用ID - 使用从IndexedDB返回的实际ID
            const fileRef = fileInfo.id; // 直接使用 largeFileStorage.storeFile 返回的 ID
            
            console.log('🔍 DEBUG: Generated fileRef:', fileRef);
            console.log('🔍 DEBUG: fileInfo.id exists:', !!fileInfo.id);
            
            // 生成图片的markdown引用 - 使用 ./local/ 路径格式让 ReactMarkdown 正确解析
            const imageReference = `![${resource.filename || 'image'}](./local/${fileRef})`;
            
            console.log('🔍 DEBUG: Generated image reference:', imageReference);
            
            // 查找并替换现有的图片引用
            let foundExistingReference = false;
            
            // 1. 尝试通过resource.uid匹配
            if (resource.uid) {
              const uidRegex = new RegExp(`!\\[[^\\]]*\\]\\([^)]*${resource.uid}[^)]*\\)`, 'g');
              if (uidRegex.test(updatedContent)) {
                updatedContent = updatedContent.replace(uidRegex, imageReference);
                foundExistingReference = true;
                console.log(`Replaced image by UID: ${resource.uid}`);
              }
            }
            
            // 2. 如果还没找到，尝试通过文件名匹配
            if (!foundExistingReference && resource.filename) {
              const filenameRegex = new RegExp(`!\\[[^\\]]*\\]\\([^)]*${resource.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^)]*\\)`, 'g');
              if (filenameRegex.test(updatedContent)) {
                updatedContent = updatedContent.replace(filenameRegex, imageReference);
                foundExistingReference = true;
                console.log(`Replaced image by filename: ${resource.filename}`);
              }
            }
            
            // 3. 如果还没找到，尝试通过常见URL模式匹配
            if (!foundExistingReference) {
              const urlPatterns = [
                `https://s3.bmp.ovh/imgs/`,
                `/api/v1/resource/`,
                `/o/r/`,
                `assets/`,
                `uploads/`
              ];
              
              for (const pattern of urlPatterns) {
                const patternRegex = new RegExp(`!\\[[^\\]]*\\]\\([^)]*${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^)]*\\)`, 'g');
                if (patternRegex.test(updatedContent)) {
                  updatedContent = updatedContent.replace(patternRegex, imageReference);
                  foundExistingReference = true;
                  console.log(`Replaced image by URL pattern: ${pattern}`);
                  break;
                }
              }
            }
            
            // 4. 如果没有找到现有引用，则添加到内容末尾
            if (!foundExistingReference && !updatedContent.includes(imageReference)) {
              updatedContent = updatedContent.trim() + '\n\n' + imageReference;
              console.log(`Added new image reference: ${imageReference}`);
            }
            
            // 只保留必要的引用信息，不存储大数据
            processedResources.push({
              uid: resource.uid,
              filename: resource.filename,
              type: resource.type,
              size: resource.size,
              fileRef,
              storageType: 'indexeddb',
              id: fileInfo.id,
              reference: imageReference
            });
          }
        } catch (error) {
          console.error('Failed to process resource:', resource.filename, error);
          // 继续处理其他资源，不要因为一个失败就停止整个导入
        }
      }
      
      // 更新memo对象
      const updatedMemoObj = {
        ...memoObj,
        content: updatedContent,
        processedResources,
        // 清理原始resources数据以节省空间
        resources: undefined
      };
      
      processedMemos.push({ memoObj: updatedMemoObj, pinned });
    } else {
      // 没有资源的memo直接添加
      processedMemos.push({ memoObj: { ...memoObj, resources: undefined }, pinned });
    }
  }
  
  return processedMemos;
}

// 将解析的 memos 合并到本地存储
async function mergeMemosIntoLocalStorage(parseResult) {
  // 首先处理资源文件
  const processedMemos = await processResourceFiles(parseResult.memos);
  
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

  for (const { memoObj, pinned } of processedMemos) {
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
    // 将最近云同步时间重置，避免下行合并把本地导入误判为"云端已删除"
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

      toast.info('正在解析数据库...');
      
      // 目前使用 sql.js 直接读取 .db；如果同时提供了 -wal/-shm，我们会接受但不保证未 checkpoint 的事务被包含
      const parseResult = await parseMemosFromSQLite(mainDbFile);
      
      const totalResources = Array.from(parseResult.resources.values())
        .reduce((total, resources) => total + resources.length, 0);
        
      if (totalResources > 0) {
        toast.info(`找到 ${parseResult.memos.length} 条记录和 ${totalResources} 个图片资源，正在处理...`);
      }
      
      const { importedCount, pinnedCount } = await mergeMemosIntoLocalStorage(parseResult);
      setDone({ importedCount, pinnedCount, resourceCount: totalResources });
      
      const message = totalResources > 0 
        ? `导入完成：新增 ${importedCount} 条记录，置顶 ${pinnedCount} 条，处理 ${totalResources} 个图片。`
        : `导入完成：新增 ${importedCount} 条记录，置顶 ${pinnedCount} 条。`;
        
      toast.success(message);
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
                {done.resourceCount > 0 && `，图片 ${done.resourceCount} 张`}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        说明：现已支持图片导入！系统将自动提取数据库中的图片资源并存储到本地。若存在尚未 checkpoint 的 WAL 记录，可能无法完全包含。建议在来源应用中执行一次完全同步/备份后再导入，以确保完整性。
      </p>
      
      {/* 临时调试按钮 */}
      <div className="mt-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
        <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">调试工具：</p>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              const memos = JSON.parse(localStorage.getItem('memos') || '[]');
              const pinnedMemos = JSON.parse(localStorage.getItem('pinnedMemos') || '[]');
              console.log('Stored memos:', memos);
              console.log('Pinned memos:', pinnedMemos);
              // 找到带图片的memo
              const memosWithImages = [...memos, ...pinnedMemos].filter(m => 
                m.content.includes('local:') || 
                m.content.includes('http') || 
                (m.processedResources && m.processedResources.length > 0)
              );
              console.log('Memos with images:', memosWithImages);
              
              // 查找有外部链接的memo
              const memosWithExternalImages = [...memos, ...pinnedMemos].filter(m => 
                m.content.includes('https://') || m.content.includes('http://')
              );
              console.log('Memos with external images:', memosWithExternalImages);
              
              alert(`找到 ${memosWithImages.length} 个包含图片的memo，其中 ${memosWithExternalImages.length} 个包含外部图片链接。详情请查看控制台`);
            }}
          >
            查看本地数据
          </Button>
          
          <Button 
            size="sm" 
            variant="destructive"
            onClick={async () => {
              if (confirm('确认清空所有已导入的memo数据和图片？此操作不可恢复！')) {
                try {
                  // 清空localStorage
                  localStorage.removeItem('memos');
                  localStorage.removeItem('pinnedMemos');
                  
                  // 清空IndexedDB中的图片数据
                  const stats = await fileStorageService.getStorageStats();
                  console.log('Current storage stats:', stats);
                  
                  // 通知页面数据已清空
                  window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { part: 'restore.clear' } }));
                  
                  alert('已清空所有memo数据和图片，请重新导入');
                } catch (error) {
                  console.error('清空数据时出错:', error);
                  alert('清空数据时出现错误，请检查控制台');
                }
              }
            }}
          >
            清空数据
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={async () => {
              try {
                const stats = await fileStorageService.getStorageStats();
                console.log('Storage stats:', stats);
                
                const totalSizeMB = stats?.indexeddb?.totalSizeMB || 0;
                const totalFiles = stats?.indexeddb?.totalFiles || 0;
                
                alert(`IndexedDB存储状态：\n文件数: ${totalFiles}\n总大小: ${totalSizeMB}MB\n详情请查看控制台`);
              } catch (error) {
                console.error('获取存储统计失败:', error);
                alert('获取存储统计失败，请检查控制台');
              }
            }}
          >
            存储统计
          </Button>
        </div>
      </div>
    </div>
  );
}
