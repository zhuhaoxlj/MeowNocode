import { useState, useEffect } from 'react';
import { dataService } from '../../lib/client/dataService.js';

// 简化的 UI 组件
const Button = ({ children, onClick, className = '', disabled = false, variant = 'default' }) => {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    default: 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
    destructive: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children }) => (
  <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
    {children}
  </div>
);

const CardContent = ({ children }) => (
  <div className="p-6">
    {children}
  </div>
);

const CardTitle = ({ children }) => (
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
    {children}
  </h2>
);

// Memo输入组件
const MemoInput = ({ onSubmit }) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        content: content.trim(),
        tags: tags.trim(),
        visibility: 'private'
      });
      setContent('');
      setTags('');
    } catch (error) {
      alert('创建失败: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>📝 创建新备忘录</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入您的想法... 支持 Markdown 格式"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       resize-none"
              rows="4"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex gap-4">
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="标签 (用逗号分隔)"
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
            <Button 
              type="submit" 
              disabled={!content.trim() || isSubmitting}
              className="shrink-0"
            >
              {isSubmitting ? '创建中...' : '创建'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Memo列表组件
const MemoList = ({ memos, onEdit, onDelete, onTogglePin }) => {
  if (memos.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              还没有备忘录，创建第一个吧！
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {memos.map((memo) => (
        <MemoCard 
          key={memo.id} 
          memo={memo} 
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  );
};

// 单个Memo卡片
const MemoCard = ({ memo, onEdit, onDelete, onTogglePin }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(memo.content);
  const [editTags, setEditTags] = useState(memo.tags || '');

  const handleSave = async () => {
    try {
      await onEdit(memo.id, {
        content: editContent.trim(),
        tags: editTags.trim(),
        visibility: memo.visibility,
        pinned: memo.pinned
      });
      setIsEditing(false);
    } catch (error) {
      alert('保存失败: ' + error.message);
    }
  };

  const handleCancel = () => {
    setEditContent(memo.content);
    setEditTags(memo.tags || '');
    setIsEditing(false);
  };

  return (
    <Card className={`transition-all ${memo.pinned ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            {memo.pinned && (
              <div className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 mb-3">
                📌 已置顶
              </div>
            )}
            
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           resize-none"
                  rows="4"
                />
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="标签 (用逗号分隔)"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm">保存</Button>
                  <Button onClick={handleCancel} variant="secondary" size="sm">取消</Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-900 dark:text-white">
                    {memo.content}
                  </pre>
                </div>
                
                {memo.tags && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {memo.tags.split(',').filter(tag => tag.trim()).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium 
                                 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      >
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <div>创建: {new Date(memo.created_ts).toLocaleString()}</div>
                    {memo.updated_ts !== memo.created_ts && (
                      <div>更新: {new Date(memo.updated_ts).toLocaleString()}</div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onTogglePin(memo.id, !memo.pinned)}
                      variant="secondary"
                      className="text-sm px-3 py-1"
                    >
                      {memo.pinned ? '取消置顶' : '置顶'}
                    </Button>
                    <Button 
                      onClick={() => setIsEditing(true)}
                      variant="secondary"
                      className="text-sm px-3 py-1"
                    >
                      编辑
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm('确定要删除这个备忘录吗？')) {
                          onDelete(memo.id);
                        }
                      }}
                      variant="destructive"
                      className="text-sm px-3 py-1"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 主应用组件
export default function FullMemoApp() {
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pinned: 0 });

  // 加载数据
  const loadMemos = async () => {
    try {
      setLoading(true);
      const memosData = await dataService.getAllMemos();
      setMemos(memosData);
      
      // 计算统计信息
      setStats({
        total: memosData.length,
        pinned: memosData.filter(memo => memo.pinned).length
      });
    } catch (error) {
      console.error('加载 memos 失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新memo
  const handleCreateMemo = async (data) => {
    await dataService.createMemo(data);
    await loadMemos();
  };

  // 编辑memo
  const handleEditMemo = async (id, data) => {
    await dataService.updateMemo(id, data);
    await loadMemos();
  };

  // 删除memo
  const handleDeleteMemo = async (id) => {
    await dataService.deleteMemo(id);
    await loadMemos();
  };

  // 切换置顶状态
  const handleTogglePin = async (id, pinned) => {
    const memo = memos.find(m => m.id === id);
    if (memo) {
      await dataService.updateMemo(id, { ...memo, pinned });
      await loadMemos();
    }
  };

  useEffect(() => {
    loadMemos();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在加载备忘录...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🐱 MeowNocode
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Next.js 版本 - 支持跨浏览器数据共享
              </p>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>后端已连接</span>
              </div>
              <div>总计: {stats.total} 条</div>
              <div>置顶: {stats.pinned} 条</div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧 - 创建新memo */}
          <div className="lg:col-span-1">
            <MemoInput onSubmit={handleCreateMemo} />
            
            {/* 功能状态 */}
            <Card>
              <CardHeader>
                <CardTitle>🚀 功能状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>基础备忘录功能</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>跨浏览器数据共享</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span>画布编辑器 (迁移中)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span>音乐播放器 (迁移中)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span>AI对话 (迁移中)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    <span>主题系统 (待迁移)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧 - memo列表 */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                📋 我的备忘录
              </h2>
            </div>
            <MemoList 
              memos={memos}
              onEdit={handleEditMemo}
              onDelete={handleDeleteMemo}
              onTogglePin={handleTogglePin}
            />
          </div>
        </div>
      </main>

      {/* 底部信息 */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>✅ Next.js 后端 + RESTful API - 完全迁移版本开发中</p>
            <p>🔄 原 Vite 版本可通过 <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">npm run dev:vite</code> 运行</p>
          </div>
        </div>
      </footer>
    </div>
  );
}