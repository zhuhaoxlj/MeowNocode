/**
 * Next.js 版本的主页面 - 使用服务器端 API
 * 实现真正的跨浏览器数据共享
 */
import React, { useState, useEffect } from 'react';
import { nextApiClient } from '@/lib/nextApiClient';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

const IndexNext = () => {
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMemo, setNewMemo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 加载备忘录
  useEffect(() => {
    loadMemos();
  }, []);

  const loadMemos = async () => {
    try {
      setLoading(true);
      const data = await nextApiClient.getMemos();
      setMemos(data);
    } catch (error) {
      console.error('加载备忘录失败:', error);
      toast.error('加载备忘录失败');
    } finally {
      setLoading(false);
    }
  };

  const createMemo = async () => {
    if (!newMemo.trim()) return;

    try {
      const memo = await nextApiClient.createMemo({
        content: newMemo.trim(),
        tags: [],
        pinned: false
      });
      
      setMemos(prev => [memo, ...prev]);
      setNewMemo('');
      toast.success('备忘录已创建');
    } catch (error) {
      console.error('创建备忘录失败:', error);
      toast.error('创建备忘录失败');
    }
  };

  const deleteMemo = async (id) => {
    try {
      await nextApiClient.deleteMemo(id);
      setMemos(prev => prev.filter(memo => memo.id !== id));
      toast.success('备忘录已删除');
    } catch (error) {
      console.error('删除备忘录失败:', error);
      toast.error('删除备忘录失败');
    }
  };

  const togglePin = async (id) => {
    try {
      const memo = memos.find(m => m.id === id);
      if (!memo) return;

      console.log('🔍 DEBUG: Before pin toggle - memo:', JSON.stringify(memo, null, 2));
      console.log('🔍 DEBUG: Sending pin update with data:', { pinned: !memo.pinned });

      const updated = await nextApiClient.updateMemo(id, {
        pinned: !memo.pinned
      });
      
      console.log('✅ DEBUG: Received updated memo:', JSON.stringify(updated, null, 2));
      
      setMemos(prev => prev.map(m => m.id === id ? updated : m));
      toast.success(updated.pinned ? '已置顶' : '已取消置顶');
    } catch (error) {
      console.error('切换置顶失败:', error);
      toast.error('操作失败');
    }
  };

  // 筛选备忘录
  const filteredMemos = memos.filter(memo =>
    searchQuery ? memo.content.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const pinnedMemos = filteredMemos.filter(memo => memo.pinned);
  const regularMemos = filteredMemos.filter(memo => !memo.pinned);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                📝 MeowNocode Next.js
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                跨浏览器数据共享 · 服务器端存储 · {memos.length} 条备忘录
              </p>
            </div>
            <button
              onClick={loadMemos}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🔄 刷新
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索备忘录..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* New Memo */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <textarea
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
            placeholder="写下你的想法..."
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                createMemo();
              }
            }}
          />
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-500">
              Ctrl/Cmd + Enter 发送
            </p>
            <button
              onClick={createMemo}
              disabled={!newMemo.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ➕ 添加备忘录
            </button>
          </div>
        </div>

        {/* Pinned Memos */}
        {pinnedMemos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📌 置顶备忘录
            </h2>
            <div className="space-y-4">
              {pinnedMemos.map(memo => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  onDelete={() => deleteMemo(memo.id)}
                  onTogglePin={() => togglePin(memo.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Memos */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📄 所有备忘录
          </h2>
          {regularMemos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? '没有找到匹配的备忘录' : '还没有备忘录，快来创建第一条吧！'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {regularMemos.map(memo => (
                <MemoCard
                  key={memo.id}
                  memo={memo}
                  onDelete={() => deleteMemo(memo.id)}
                  onTogglePin={() => togglePin(memo.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Status Bar */}
      <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 mt-12">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-600 dark:text-gray-400">
          💾 数据自动保存到服务器 · 支持跨浏览器访问 · Next.js + SQLite
        </div>
      </footer>
    </div>
  );
};

// 备忘录卡片组件
const MemoCard = ({ memo, onDelete, onTogglePin }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <pre className="whitespace-pre-wrap text-gray-900 dark:text-white font-sans">
            {memo.content}
          </pre>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={onTogglePin}
            className={`p-2 rounded-lg transition-colors ${
              memo.pinned 
                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={memo.pinned ? '取消置顶' : '置顶'}
          >
            {memo.pinned ? '📌' : '📍'}
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <div className="flex gap-2">
          {memo.tags && memo.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded">
              #{tag}
            </span>
          ))}
        </div>
        <div>
          {formatDate(memo.createdAt)}
          {memo.pinned && <span className="ml-2 text-yellow-600">📌</span>}
        </div>
      </div>
    </div>
  );
};

export default IndexNext;