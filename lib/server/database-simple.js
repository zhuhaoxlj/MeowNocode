// 简化的内存数据库，避免 SQLite 编译问题
import fs from 'fs';
import path from 'path';

class MemoryDatabase {
  constructor() {
    this.memos = [];
    this.resources = [];
    this.settings = {};
    this.nextMemoId = 1;
    this.nextResourceId = 1;
    this.dataFile = path.join(process.cwd(), 'data', 'memory-db.json');
    
    // 先尝试加载现有数据，如果没有则添加示例数据
    this.loadData();
  }
  
  // 加载数据文件
  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.memos = data.memos || [];
        this.resources = data.resources || [];
        this.settings = data.settings || {};
        this.nextMemoId = data.nextMemoId || 1;
        this.nextResourceId = data.nextResourceId || 1;
        console.log('🔄 数据已从文件加载:', this.dataFile);
        console.log('📝 加载的备忘录数量:', this.memos.length);
      } else {
        console.log('📁 数据文件不存在，添加示例数据');
        this.addSampleData();
      }
    } catch (error) {
      console.error('❌ 加载数据失败:', error);
      this.addSampleData();
    }
  }
  
  // 清理所有数据
  clearAllMemos() {
    this.memos = [];
    this.resources = [];
    this.nextMemoId = 1;
    this.nextResourceId = 1;
    this.saveData();
    console.log('🧹 所有数据已清理');
  }

  // 保存数据到文件
  saveData() {
    try {
      const data = {
        memos: this.memos,
        resources: this.resources,
        settings: this.settings,
        nextMemoId: this.nextMemoId,
        nextResourceId: this.nextResourceId
      };
      
      // 确保数据目录存在
      const dataDir = path.dirname(this.dataFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.log('💾 数据已保存到文件:', this.dataFile);
    } catch (error) {
      console.error('❌ 保存数据失败:', error);
    }
  }

  addSampleData() {
    const sampleMemos = [
      {
        id: 1,
        content: '欢迎使用 MeowNocode Next.js 版本！🎉\n\n这是一个完全重新架构的版本，支持跨浏览器数据共享。',
        tags: '欢迎,Next.js',
        visibility: 'private',
        pinned: true,
        archived: false,
        created_ts: new Date().toISOString(),
        updated_ts: new Date().toISOString()
      },
      {
        id: 2,
        content: '## 主要功能\n\n- ✅ 跨浏览器数据同步\n- ✅ RESTful API 后端\n- ✅ SQLite 数据库存储\n- 🔄 正在迁移更多功能...',
        tags: '功能,进度',
        visibility: 'private',
        pinned: false,
        archived: false,
        created_ts: new Date(Date.now() - 60000).toISOString(),
        updated_ts: new Date(Date.now() - 60000).toISOString()
      },
      {
        id: 3,
        content: '### 迁移进度\n\n当前版本是基础功能演示，完整的 UI 和功能正在逐步迁移中：\n\n- [x] 基础备忘录功能\n- [ ] 画布编辑器\n- [ ] 音乐播放器\n- [ ] AI 对话\n- [ ] 主题系统\n- [ ] 文件上传',
        tags: '迁移,TODO',
        visibility: 'private',
        pinned: false,
        archived: false,
        created_ts: new Date(Date.now() - 120000).toISOString(),
        updated_ts: new Date(Date.now() - 120000).toISOString()
      }
    ];
    
    this.memos = sampleMemos;
    this.nextMemoId = 4;
    this.saveData(); // 保存示例数据
  }
  
  // Memos 操作
  getAllMemos(includeArchived = false) {
    let filteredMemos = this.memos;
    
    // 默认情况下不包含归档的 memos
    if (!includeArchived) {
      filteredMemos = this.memos.filter(memo => !memo.archived);
    }
    
    return [...filteredMemos].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_ts) - new Date(a.created_ts);
    });
  }
  
  getArchivedMemos() {
    return [...this.memos]
      .filter(memo => memo.archived)
      .sort((a, b) => new Date(b.created_ts) - new Date(a.created_ts));
  }
  
  getMemoById(id) {
    return this.memos.find(memo => memo.id == id);
  }
  
  createMemo(data) {
    const { content, tags = '', visibility = 'private', pinned = false, archived = false, createdAt, updatedAt, created_ts, updated_ts } = data;
    const now = new Date().toISOString();
    
    const memo = {
      id: this.nextMemoId++,
      content,
      tags,
      visibility,
      pinned: !!pinned,
      archived: !!archived,  // 支持归档功能
      created_ts: created_ts || createdAt || now,  // 支持自定义创建时间（优先使用 created_ts，兼容 createdAt）
      updated_ts: updated_ts || updatedAt || now   // 支持自定义更新时间（优先使用 updated_ts，兼容 updatedAt）
    };
    
    this.memos.push(memo);
    this.saveData(); // 自动保存数据
    return memo;
  }
  
  updateMemo(id, data) {
    console.log('🔍 DEBUG updateMemo called with:', { id, data });
    const memoIndex = this.memos.findIndex(memo => memo.id == id);
    if (memoIndex === -1) {
      console.log('❌ DEBUG: Memo not found with id:', id);
      return null;
    }
    
    const now = new Date().toISOString();
    const currentMemo = this.memos[memoIndex];
    console.log('📝 DEBUG: Current memo before update:', JSON.stringify(currentMemo, null, 2));
    
    // 只更新提供的字段，保持其他字段不变
    const updatedMemo = {
      ...currentMemo,
      updated_ts: now
    };
    
    // 只有当字段存在时才更新
    if (data.content !== undefined) updatedMemo.content = data.content;
    if (data.tags !== undefined) updatedMemo.tags = data.tags;
    if (data.visibility !== undefined) updatedMemo.visibility = data.visibility;
    if (data.pinned !== undefined) updatedMemo.pinned = !!data.pinned;
    if (data.archived !== undefined) updatedMemo.archived = !!data.archived;
    
    console.log('✅ DEBUG: Updated memo after changes:', JSON.stringify(updatedMemo, null, 2));
    
    this.memos[memoIndex] = updatedMemo;
    this.saveData(); // 自动保存数据
    return this.memos[memoIndex];
  }
  
  deleteMemo(id) {
    const memoIndex = this.memos.findIndex(memo => memo.id == id);
    if (memoIndex === -1) return false;
    
    this.memos.splice(memoIndex, 1);
    // 同时删除相关资源
    this.resources = this.resources.filter(resource => resource.memo_id != id);
    this.saveData(); // 自动保存数据
    return true;
  }
  
  // Resources 操作
  getResourcesByMemoId(memoId) {
    return this.resources.filter(resource => resource.memo_id == memoId);
  }
  
  createResource(data) {
    const { memo_id, filename, type, size, blob } = data;
    const resource = {
      id: this.nextResourceId++,
      memo_id,
      filename,
      type,
      size,
      blob,
      created_ts: new Date().toISOString()
    };
    
    this.resources.push(resource);
    return resource.id;
  }
  
  // Settings 操作
  getSetting(key) {
    return this.settings[key] || null;
  }
  
  setSetting(key, value) {
    this.settings[key] = value;
  }
}

// 单例模式
let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new MemoryDatabase();
    console.log('✅ 内存数据库初始化成功 (包含示例数据)');
  }
  return dbInstance;
}

export default getDatabase;