import React from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import MemoEditor from '@/components/MemoEditor';

// 🚀 使用 React.memo 优化，避免父组件重渲染时不必要的更新
const MemoInput = React.memo(({ newMemo, setNewMemo, onAddMemo, onEditorFocus, onEditorBlur, allMemos = [], onAddBacklink, onPreviewMemo, pendingNewBacklinks = [], onRemoveBacklink }) => {
  // 🚀 性能优化：使用本地状态管理输入，完全自主，不受父组件影响
  const [localValue, setLocalValue] = React.useState('');
  const [attachments, setAttachments] = React.useState([]); // 附件列表
  const updateTimerRef = React.useRef(null);
  const rafRef = React.useRef(null);

  // 🚀 移除了 useEffect 同步，避免父组件状态变化导致输入框闪烁
  // 现在输入框完全由本地状态控制，提交时立即清空

  // 🚀 优化的 handleChange：只更新本地状态，不触发父组件重渲染
  const handleChange = React.useCallback((value) => {
    setLocalValue(value);
  }, []);

  // 🚀 处理提交（Ctrl+Enter） - 参考 memos 实现
  const handleSubmit = React.useCallback(async () => {
    if (!localValue.trim() && attachments.length === 0) return;
    
    console.log('🚀 [MemoInput handleSubmit] localValue:', localValue, 'attachments:', attachments);
    
    // 构建 memo 数据（类似 memos 的结构）
    const memoData = {
      content: localValue.trim(),
      attachmentIds: attachments.map(att => att.id) // 只传附件 ID
    };
    
    // 1. 立即清空本地输入框和附件（避免闪烁）
    setLocalValue('');
    setAttachments([]);
    
    // 2. 清理定时器
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // 3. 同步父组件状态
    setNewMemo(memoData.content);
    
    // 4. 传递完整数据给 onAddMemo
    onAddMemo(memoData);
  }, [localValue, attachments, setNewMemo, onAddMemo]);

  // 🚀 清理定时器和动画帧
  React.useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2">
      <div className="relative">
        <MemoEditor
          value={localValue}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="现在的想法是……"
          maxLength={5000}
          showCharCount={true}
          autoFocus={false}
          onFocus={onEditorFocus}
          onBlur={onEditorBlur}
          memosList={allMemos}
          currentMemoId={null}
          backlinks={pendingNewBacklinks}
          onAddBacklink={onAddBacklink}
          onPreviewMemo={onPreviewMemo}
          onRemoveBacklink={onRemoveBacklink}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
        />
        <Button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={handleSubmit}
          disabled={!localValue.trim() && attachments.length === 0}
          className="absolute bottom-12 right-2 rounded-lg bg-slate-600 hover:bg-slate-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white shadow-md px-3 py-2 flex items-center transition-colors"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
});

MemoInput.displayName = 'MemoInput';

export default MemoInput;
