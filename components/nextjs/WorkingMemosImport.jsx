/**
 * 可工作的 Memos 数据库导入组件
 * 使用 API 路由在服务器端处理数据库解析
 */
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Upload, Database as DatabaseIcon, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '../../src/components/ui/button';
import { Label } from '../../src/components/ui/label';
import { toast } from 'sonner';

// 处理导入结果，触发页面刷新
async function handleImportResult(result) {
  // 数据已经在后端处理并写入数据库
  // 这里只需要触发页面刷新以显示新数据
  try {
    // 触发数据重新加载事件
    window.dispatchEvent(new CustomEvent('app:dataChanged', { 
      detail: { part: 'memos.import', source: 'backend' } 
    }));
    
    // 强制刷新页面以确保显示最新数据
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.warn('触发数据刷新事件失败:', error);
  }

  return {
    importedCount: result.insertedCount || 0,
    pinnedCount: result.pinnedCount || 0,
    resourceCount: result.summary?.resourceCount || 0
  };
}

const ACCEPT_EXTS = ['.db', '.db-wal', '.db-shm'];

export default function WorkingMemosImport() {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [progress, setProgress] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // 确保只在客户端执行
  useEffect(() => {
    setIsClient(true);
  }, []);

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
    setDone(null); // 重置完成状态
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = validateAndGroup(e.dataTransfer.files);
    setSelected(files);
    setDone(null); // 重置完成状态
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

  const clearSelection = () => {
    setSelected([]);
    setDone(null);
    setDiagnostics(null);
    setShowDiagnostics(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const startImport = async () => {
    if (!mainDbFile) {
      toast.error('请选择 .db 数据库文件');
      return;
    }

    try {
      setBusy(true);
      setDone(null);
      setProgress('正在上传数据库文件...');

      // 创建 FormData 上传所有相关文件
      const formData = new FormData();
      
      // 上传主数据库文件
      formData.append('database', mainDbFile);
      
      // 查找并上传 WAL 和 SHM 文件
      const dbBaseName = mainDbFile.name.replace('.db', '');
      const walFile = selected.find(f => f.name === `${dbBaseName}.db-wal`);
      const shmFile = selected.find(f => f.name === `${dbBaseName}.db-shm`);
      
      if (walFile) {
        formData.append('wal', walFile);
        console.log('📂 包含 WAL 文件:', walFile.name);
      }
      
      if (shmFile) {
        formData.append('shm', shmFile);
        console.log('📂 包含 SHM 文件:', shmFile.name);
      }
      
      // 设置上传进度提示
      const fileCount = 1 + (walFile ? 1 : 0) + (shmFile ? 1 : 0);
      setProgress(`正在上传 ${fileCount} 个数据库文件...`);

      // 发送到 API 路由处理
      const response = await fetch('/api/memos-import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '导入失败');
      }

      if (!result.success) {
        throw new Error(result.error || '服务器处理失败');
      }

      setProgress('正在保存到数据库...');
      
      // 保存诊断信息
      if (result.data.diagnostics || result.data.skippedRecords || result.data.dbDiscrepancy) {
        setDiagnostics({
          diagnostics: result.data.diagnostics || [],
          skippedRecords: result.data.skippedRecords || [],
          dbDiscrepancy: result.data.dbDiscrepancy,
          summary: result.data.summary
        });
      }
      
      // 处理导入结果，数据已经在后端写入数据库
      const mergeResult = await handleImportResult(result.data);
      
      setProgress('');
      setDone(mergeResult);
      
      // 根据导入情况显示不同的消息
      let successMessage = `成功导入 ${mergeResult.importedCount} 条记录！`;
      if (result.data.skippedCount > 0) {
        successMessage += ` (跳过 ${result.data.skippedCount} 条过大记录)`;
      }
      
      toast.success(successMessage);

      // 清理选择的文件
      setTimeout(() => {
        clearSelection();
      }, 2000);

    } catch (error) {
      console.error('导入过程中出现错误:', error);
      toast.error(`导入失败: ${error.message}`);
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  // 如果不在客户端，返回加载提示
  if (!isClient) {
    return (
      <div className="p-4 text-center text-gray-500">
        正在加载导入功能...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">从 Memos 数据库导入</Label>

      {/* 文件选择区域 */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <DatabaseIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          拖拽 Memos 数据库文件到此处，或点击选择文件
        </p>
        <Button onClick={handleChoose} variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          选择文件
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".db,.db-wal,.db-shm"
          onChange={onInputChange}
          className="hidden"
        />
      </div>

      {/* 已选择文件列表 */}
      {selected.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">已选择文件:</Label>
            <Button
              onClick={clearSelection}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {selected.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
              >
                <span className="truncate mr-2">{file.name}</span>
                <span className="text-gray-500 flex-shrink-0">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 进度显示 */}
      {progress && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-blue-800 dark:text-blue-200">{progress}</span>
          </div>
        </div>
      )}

      {/* 导入按钮 */}
      {mainDbFile && !done && (
        <Button
          onClick={startImport}
          disabled={busy}
          className="w-full"
        >
          {busy ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              导入中...
            </>
          ) : (
            <>
              <DatabaseIcon className="h-4 w-4 mr-2" />
              开始导入
            </>
          )}
        </Button>
      )}

      {/* 导入结果 */}
      {done && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="text-sm text-green-800 dark:text-green-200">
              <div className="font-medium mb-1">导入成功！</div>
              <div>
                新增 {done.importedCount} 条备忘录
                {done.pinnedCount > 0 && `，其中 ${done.pinnedCount} 条置顶`}
                {done.resourceCount > 0 && `，包含 ${done.resourceCount} 个图片附件`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 诊断信息 */}
      {diagnostics && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              {showDiagnostics ? '隐藏' : '显示'}诊断信息
              {diagnostics.dbDiscrepancy && (
                <AlertCircle className="h-3 w-3 ml-1 text-orange-500" />
              )}
            </Button>
            {diagnostics.dbDiscrepancy && (
              <span className="text-xs text-orange-600 dark:text-orange-400">
                发现数据不一致
              </span>
            )}
          </div>
          
          {showDiagnostics && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border text-xs space-y-3">
              {/* 数据不一致警告 */}
              {diagnostics.dbDiscrepancy && (
                <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                  <div className="font-medium text-orange-800 dark:text-orange-200 mb-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    数据不一致检测
                  </div>
                  <div className="text-orange-700 dark:text-orange-300 space-y-1">
                    <div>数据库总记录: {diagnostics.dbDiscrepancy.dbTotal}</div>
                    <div>解析成功: {diagnostics.dbDiscrepancy.parsedTotal}</div>
                    <div>最终导入: {diagnostics.dbDiscrepancy.importedTotal}</div>
                    <div>解析阶段跳过: {diagnostics.dbDiscrepancy.lostInParsing}</div>
                    <div>导入阶段跳过: {diagnostics.dbDiscrepancy.lostInImport}</div>
                  </div>
                </div>
              )}
              
              {/* 跳过记录详情 */}
              {diagnostics.skippedRecords && diagnostics.skippedRecords.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    跳过记录详情 ({diagnostics.skippedRecords.length} 条):
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {diagnostics.skippedRecords.map((record, index) => (
                      <div key={index} className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border-l-2 border-yellow-300">
                        <div className="text-yellow-800 dark:text-yellow-200">
                          <span className="font-medium">{record.reason}</span>
                          {record.id && <span className="ml-2">ID: {record.id}</span>}
                          {record.row_status && <span className="ml-2">状态: {record.row_status}</span>}
                        </div>
                        {record.content_preview && (
                          <div className="text-yellow-600 dark:text-yellow-400 mt-1 truncate">
                            内容: {record.content_preview}...
                          </div>
                        )}
                        {record.error && (
                          <div className="text-red-600 dark:text-red-400 mt-1">
                            错误: {record.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 详细诊断日志 */}
              {diagnostics.diagnostics && diagnostics.diagnostics.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    详细诊断日志:
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-2 rounded font-mono text-xs">
                    {diagnostics.diagnostics.map((log, index) => (
                      <div key={index} className="text-gray-600 dark:text-gray-400">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
        <p>
          <strong>说明：</strong>支持导入 Memos 应用的 SQLite 数据库文件，包括所有备忘录、标签和图片附件。
        </p>
        <p>
          <strong>文件要求：</strong>请选择 .db 主文件。如果有 .db-wal 和 .db-shm 文件，建议一起选择以确保数据完整性。
        </p>
        <p>
          <strong>数据处理：</strong>系统会自动提取图片附件并将其嵌入到备忘录内容中，所有数据都会安全保存到本地存储。
        </p>
      </div>
    </div>
  );
}