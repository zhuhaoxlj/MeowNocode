/**
 * Next.js 版本的备忘录列表组件
 */

import { useState } from 'react';

export function MemoList({ memos, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const handleEdit = (memo) => {
    setEditingId(memo.id);
    setEditContent(memo.content);
  };

  const handleSaveEdit = async (id) => {
    try {
      await onUpdate(id, { content: editContent });
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('保存编辑失败:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleTogglePin = async (memo) => {
    try {
      await onUpdate(memo.id, { pinned: !memo.pinned });
    } catch (error) {
      console.error('切换置顶状态失败:', error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('确定要删除这条备忘录吗？')) {
      try {
        await onDelete(id);
      } catch (error) {
        console.error('删除备忘录失败:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (memos.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {memos.map(memo => (
        <div 
          key={memo.id}
          style={{
            background: 'white',
            border: memo.pinned ? '2px solid #fbbf24' : '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            position: 'relative'
          }}
        >
          {/* 置顶标识 */}
          {memo.pinned && (
            <div style={{
              position: 'absolute',
              top: '-8px',
              left: '16px',
              background: '#fbbf24',
              color: '#92400e',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              📌 置顶
            </div>
          )}

          {/* 内容区域 */}
          <div style={{ marginBottom: '12px' }}>
            {editingId === memo.id ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                autoFocus
              />
            ) : (
              <div 
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {memo.content}
              </div>
            )}
          </div>

          {/* 标签显示 */}
          {memo.tags && memo.tags.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              marginBottom: '12px'
            }}>
              {memo.tags.map(tag => (
                <span 
                  key={tag}
                  style={{
                    background: '#f0f9ff',
                    color: '#0369a1',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    border: '1px solid #bae6fd'
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 操作栏 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <span>
              {formatDate(memo.created_ts)}
              {memo.updated_ts !== memo.created_ts && (
                <span style={{ marginLeft: '8px' }}>
                  (已编辑)
                </span>
              )}
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              {editingId === memo.id ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      background: 'none',
                      color: '#64748b',
                      border: '1px solid #d1d5db',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleSaveEdit(memo.id)}
                    disabled={!editContent.trim()}
                    style={{
                      background: editContent.trim() ? '#16a34a' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: editContent.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    保存
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleTogglePin(memo)}
                    style={{
                      background: 'none',
                      color: memo.pinned ? '#f59e0b' : '#64748b',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title={memo.pinned ? '取消置顶' : '置顶'}
                  >
                    📌
                  </button>
                  
                  <button
                    onClick={() => handleEdit(memo)}
                    style={{
                      background: 'none',
                      color: '#64748b',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title="编辑"
                  >
                    ✏️
                  </button>
                  
                  <button
                    onClick={() => handleDelete(memo.id)}
                    style={{
                      background: 'none',
                      color: '#dc2626',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title="删除"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}