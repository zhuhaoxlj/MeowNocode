/**
 * Next.js 版本的主应用组件
 * 复用现有的 UI 组件，但使用新的数据层
 */

import { useState, useEffect } from 'react';
import { useNextData } from '../../lib/client/nextDataProvider';

// 导入现有的组件 (会适配到新的数据层)
import { Header } from '../../src/components/Header';
import { MemoInput } from './MemoInput';
import { MemoList } from './MemoList';

export function MemoApp() {
  const { memos, loading, error, createMemo, updateMemo, deleteMemo, loadMemos } = useNextData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // 筛选备忘录
  const filteredMemos = memos.filter(memo => {
    // 搜索过滤
    if (searchQuery && !memo.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // 标签过滤
    if (selectedTags.length > 0 && !selectedTags.some(tag => memo.tags.includes(tag))) {
      return false;
    }
    
    // 置顶过滤
    if (showPinnedOnly && !memo.pinned) {
      return false;
    }
    
    return true;
  });

  // 处理备忘录创建
  const handleCreateMemo = async (content, tags = []) => {
    try {
      await createMemo({
        content,
        tags,
        pinned: false
      });
    } catch (error) {
      console.error('创建备忘录失败:', error);
    }
  };

  // 处理备忘录更新
  const handleUpdateMemo = async (id, updates) => {
    try {
      await updateMemo(id, updates);
    } catch (error) {
      console.error('更新备忘录失败:', error);
    }
  };

  // 处理备忘录删除
  const handleDeleteMemo = async (id) => {
    try {
      await deleteMemo(id);
    } catch (error) {
      console.error('删除备忘录失败:', error);
    }
  };

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui',
        padding: '20px'
      }}>
        <div style={{ color: '#dc2626', fontSize: '24px', marginBottom: '10px' }}>
          ⚠️ 连接错误
        </div>
        <div style={{ color: '#666', textAlign: 'center', marginBottom: '20px' }}>
          无法连接到 Next.js 服务器<br />
          错误: {error}
        </div>
        <button 
          onClick={() => loadMemos()}
          style={{
            background: '#2563eb',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          重试连接
        </button>
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          请确保 Next.js 服务器正在运行: <code>npm run dev</code>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ 
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ 
              color: '#1e40af', 
              fontSize: '24px',
              margin: 0,
              marginBottom: '4px'
            }}>
              📝 MeowNocode Next.js
            </h1>
            <p style={{ 
              color: '#64748b', 
              fontSize: '14px',
              margin: 0
            }}>
              跨浏览器数据共享 · 服务器端存储 · {filteredMemos.length} 条备忘录
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索备忘录..."
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                width: '200px'
              }}
            />
            
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showPinnedOnly}
                onChange={(e) => setShowPinnedOnly(e.target.checked)}
              />
              只看置顶
            </label>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '24px'
      }}>
        {/* Input Area */}
        <div style={{ marginBottom: '32px' }}>
          <MemoInput 
            onSubmit={handleCreateMemo}
            disabled={loading}
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#64748b'
          }}>
            <div>🔄 加载中...</div>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>
              正在同步服务器数据
            </div>
          </div>
        )}

        {/* Memo List */}
        {!loading && (
          <MemoList
            memos={filteredMemos}
            onUpdate={handleUpdateMemo}
            onDelete={handleDeleteMemo}
          />
        )}

        {/* Empty State */}
        {!loading && filteredMemos.length === 0 && memos.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>
              还没有备忘录
            </div>
            <div style={{ fontSize: '14px' }}>
              在上方输入框中创建你的第一条备忘录吧！
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && filteredMemos.length === 0 && memos.length > 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>
              没有找到匹配的备忘录
            </div>
            <div style={{ fontSize: '14px' }}>
              尝试调整搜索条件或筛选器
            </div>
          </div>
        )}
      </main>

      {/* Status Bar */}
      <footer style={{
        background: '#f1f5f9',
        borderTop: '1px solid #e2e8f0',
        padding: '12px 24px',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        fontSize: '12px',
        color: '#64748b'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            💾 数据自动同步到服务器 · 支持跨浏览器访问
          </span>
          <span>
            Next.js v14 + SQLite + sql.js
          </span>
        </div>
      </footer>
    </div>
  );
}