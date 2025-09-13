/**
 * Next.js 版本的备忘录输入组件
 */

import { useState } from 'react';

export function MemoInput({ onSubmit, disabled = false }) {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim() || disabled) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(content.trim(), tags);
      
      // 清空输入
      setContent('');
      setTags([]);
      setTagInput('');
    } catch (error) {
      console.error('提交备忘录失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 添加标签
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  // 删除标签
  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
    if (e.key === 'Escape') {
      setTagInput('');
    }
  };

  return (
    <div style={{
      background: 'white',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <form onSubmit={handleSubmit}>
        {/* 主输入区域 */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="写点什么... (Ctrl/Cmd + Enter 快速提交)"
          disabled={disabled || isSubmitting}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'vertical',
            marginBottom: '12px',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />

        {/* 标签显示 */}
        {tags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '12px'
          }}>
            {tags.map(tag => (
              <span 
                key={tag}
                onClick={() => removeTag(tag)}
                style={{
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s',
                  border: '1px solid #bfdbfe'
                }}
                title="点击删除"
              >
                #{tag} ×
              </span>
            ))}
          </div>
        )}

        {/* 标签输入 */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          alignItems: 'center'
        }}>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="添加标签..."
            disabled={disabled || isSubmitting}
            style={{
              flex: 1,
              padding: '6px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <button 
            type="button"
            onClick={addTag}
            disabled={!tagInput.trim() || disabled || isSubmitting}
            style={{
              background: tagInput.trim() ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: tagInput.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            添加标签
          </button>
        </div>

        {/* 操作按钮 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#64748b'
          }}>
            <kbd style={{
              background: '#f1f5f9',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px'
            }}>
              Ctrl/Cmd + Enter
            </kbd> 快速提交
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setContent('');
                setTags([]);
                setTagInput('');
              }}
              disabled={disabled || isSubmitting || (!content && tags.length === 0)}
              style={{
                background: 'none',
                color: '#64748b',
                border: '1px solid #d1d5db',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              清空
            </button>
            
            <button
              type="submit"
              disabled={disabled || isSubmitting || !content.trim()}
              style={{
                background: (content.trim() && !disabled && !isSubmitting) ? '#2563eb' : '#9ca3af',
                color: 'white',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '6px',
                cursor: (content.trim() && !disabled && !isSubmitting) ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {isSubmitting ? '创建中...' : '创建备忘录'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}