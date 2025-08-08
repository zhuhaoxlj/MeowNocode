import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

const CanvasEditor = ({ onAddMemo, canvasSize, scale = 1, translate = { x: 0, y: 0 } }) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef(null);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 96); // 最大约 3 行
      textarea.style.height = `${newHeight}px`;
    }
  }, [content]);

  const handleSubmit = () => {
    if (content.trim()) {
      // 计算世界坐标中心位置（将屏幕中心转换为世界坐标）
      const screenCenterX = canvasSize.width / 2;
      const screenCenterY = canvasSize.height / 2;
      const worldX = (screenCenterX - translate.x) / scale;
      const worldY = (screenCenterY - translate.y) / scale;

      const newMemo = {
        id: Date.now(),
        content: content.trim(),
        tags: [],
        canvasX: worldX,
        canvasY: worldY,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      onAddMemo(newMemo);
      setContent('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-end gap-2 px-3 py-2 rounded-xl border bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-lg border-gray-200 dark:border-gray-700">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入笔记内容...（Enter 发送，Shift+Enter 换行）"
          className="w-80 md:w-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ minHeight: '40px', maxHeight: '96px' }}
          rows={1}
        />
        
        <button
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
          title="发送笔记"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CanvasEditor;