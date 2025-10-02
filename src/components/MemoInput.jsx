import React from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import MemoEditor from '@/components/MemoEditor';

// 🚀 使用 React.memo 优化，避免父组件重渲染时不必要的更新
const MemoInput = React.memo(({ newMemo, setNewMemo, onAddMemo, onEditorFocus, onEditorBlur, allMemos = [], onAddBacklink, onPreviewMemo, pendingNewBacklinks = [], onRemoveBacklink }) => {
  // 🚀 性能优化：使用本地状态管理输入，完全自主，不受父组件影响
  const [localValue, setLocalValue] = React.useState('');
  const updateTimerRef = React.useRef(null);
  const rafRef = React.useRef(null);

  // 🚀 移除了 useEffect 同步，避免父组件状态变化导致输入框闪烁
  // 现在输入框完全由本地状态控制，提交时立即清空

  // 🚀 优化的 handleChange：只更新本地状态，不触发父组件重渲染
  const handleChange = React.useCallback((value) => {
    setLocalValue(value);
  }, []);

  // 🚀 处理提交（Ctrl+Enter）
  const handleSubmit = React.useCallback(() => {
    if (!localValue.trim()) return;
    
    console.log('🚀 [MemoInput handleSubmit] localValue:', localValue);
    
    // 保存要提交的内容
    const contentToSubmit = localValue.trim();
    
    // 1. 立即清空本地输入框（避免闪烁）
    setLocalValue('');
    
    // 2. 清理定时器
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // 3. 同步父组件状态
    setNewMemo(contentToSubmit);
    
    // 4. 直接传递内容给 onAddMemo
    onAddMemo(contentToSubmit);
  }, [localValue, setNewMemo, onAddMemo]);

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
        />
        <Button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={handleSubmit}
          disabled={!localValue.trim()}
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
