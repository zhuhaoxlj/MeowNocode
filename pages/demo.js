/**
 * 跨浏览器数据共享演示页面
 */
import { useState, useEffect } from 'react';

export default function Demo() {
  const [memos, setMemos] = useState([]);
  const [newMemo, setNewMemo] = useState('');
  const [loading, setLoading] = useState(true);

  // 加载备忘录
  useEffect(() => {
    loadMemos();
  }, []);

  const loadMemos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/memos');
      if (response.ok) {
        const data = await response.json();
        setMemos(data.memos || []);
      }
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMemo = async () => {
    if (!newMemo.trim()) return;

    try {
      const response = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMemo.trim(),
          tags: [],
          pinned: false
        })
      });

      if (response.ok) {
        const memo = await response.json();
        setMemos(prev => [memo, ...prev]);
        setNewMemo('');
        alert('✅ 备忘录已添加！现在可以在其他浏览器中查看了！');
      }
    } catch (error) {
      console.error('添加失败:', error);
      alert('❌ 添加失败');
    }
  };

  const deleteMemo = async (id) => {
    try {
      const response = await fetch(`/api/memos/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMemos(prev => prev.filter(m => m.id !== id));
        alert('🗑️ 备忘录已删除！');
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px' 
    }}>
      <div style={{ 
        background: '#f0f9ff', 
        border: '2px solid #0ea5e9', 
        borderRadius: '10px', 
        padding: '20px', 
        marginBottom: '30px' 
      }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#0369a1' }}>
          🎉 Next.js 跨浏览器数据共享演示
        </h1>
        <p style={{ margin: '0', color: '#075985' }}>
          现在数据存储在服务器端！在不同浏览器中添加备忘录，都能看到相同的数据！
        </p>
      </div>

      {/* 添加备忘录 */}
      <div style={{ 
        background: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '10px', 
        padding: '20px', 
        marginBottom: '20px' 
      }}>
        <h2>➕ 添加新备忘录</h2>
        <textarea
          value={newMemo}
          onChange={(e) => setNewMemo(e.target.value)}
          placeholder="写下你的想法..."
          style={{ 
            width: '100%', 
            height: '100px', 
            padding: '10px', 
            border: '1px solid #d1d5db', 
            borderRadius: '5px',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            添加后可以在其他浏览器中查看
          </span>
          <button 
            onClick={addMemo}
            disabled={!newMemo.trim()}
            style={{ 
              background: !newMemo.trim() ? '#9ca3af' : '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              padding: '8px 16px',
              cursor: !newMemo.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            添加备忘录
          </button>
        </div>
      </div>

      {/* 备忘录列表 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2>📝 备忘录列表 ({memos.length})</h2>
          <button 
            onClick={loadMemos}
            style={{ 
              background: '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              padding: '6px 12px',
              cursor: 'pointer'
            }}
          >
            🔄 刷新
          </button>
        </div>
        
        {loading ? (
          <p>⏳ 加载中...</p>
        ) : memos.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
            📭 还没有备忘录，快来创建第一条吧！
          </p>
        ) : (
          <div>
            {memos.map(memo => (
              <div key={memo.id} style={{ 
                background: memo.pinned ? '#fef3c7' : 'white',
                border: '1px solid #e5e7eb', 
                borderRadius: '10px', 
                padding: '15px', 
                marginBottom: '10px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 10px 0', whiteSpace: 'pre-wrap' }}>
                      {memo.content}
                    </p>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {memo.pinned && <span style={{ color: '#f59e0b' }}>📌 置顶 · </span>}
                      创建于: {new Date(memo.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteMemo(memo.id)}
                    style={{ 
                      background: '#ef4444', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '5px', 
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginLeft: '10px'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 测试说明 */}
      <div style={{ 
        background: '#f0fdf4', 
        border: '1px solid #22c55e', 
        borderRadius: '10px', 
        padding: '20px', 
        marginTop: '30px' 
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#166534' }}>🧪 测试跨浏览器数据共享</h3>
        <ol style={{ margin: '0', color: '#166534' }}>
          <li>在当前浏览器中添加一条备忘录</li>
          <li>打开另一个浏览器（如 Chrome、Firefox、Safari）</li>
          <li>访问相同的地址: <code>http://localhost:8081/demo</code></li>
          <li>🎉 神奇的时刻：你会看到刚才添加的备忘录！</li>
        </ol>
      </div>
    </div>
  );
}