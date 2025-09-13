# Next.js 迁移指南

这份指南将帮助您将现有的 Vite + React 项目迁移到 Next.js，实现真正的跨浏览器数据共享。

## 🎯 **迁移优势**

### ✅ **解决当前问题**
- **跨浏览器数据共享**: 统一的服务器端数据存储
- **真正的本地数据库**: 服务器端 SQLite，不是浏览器存储
- **专业架构**: 现代全栈开发标准
- **更好的SEO**: 服务器端渲染支持

### ✅ **技术提升**
- **API Routes**: 内置的服务器端 API
- **文件系统路由**: 约定优于配置
- **优化打包**: 自动代码分割和优化
- **部署简单**: Vercel 等平台一键部署

---

## 📋 **迁移步骤**

### 1. **安装依赖**

```bash
# 在当前项目目录执行
npm install next react react-dom better-sqlite3 formidable nanoid
npm install -D @types/node typescript
```

### 2. **更新 package.json**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:backup": "node scripts/backup-db.js"
  }
}
```

### 3. **项目结构调整**

```
MeowNocode/
├── pages/                  # Next.js 页面
│   ├── api/               # API 路由 (已创建)
│   ├── _app.js            # 应用入口
│   └── index.js           # 首页
├── components/            # React 组件 (保持不变)
├── lib/                   
│   ├── server/            # 服务器端代码 (已创建)
│   └── client/            # 客户端代码
├── data/                  # 数据存储目录
│   ├── meownocode.db      # SQLite 数据库
│   └── uploads/           # 上传文件
├── public/                # 静态资源
└── next.config.js         # Next.js 配置
```

### 4. **迁移现有组件**

大部分 React 组件可以直接使用，只需要调整导入路径：

```jsx
// 原来
import { MemoList } from '../components/MemoList';

// 现在  
import { MemoList } from '../components/MemoList';
```

### 5. **创建页面文件**

#### `pages/_app.js` - 应用入口
```jsx
import '../src/index.css'
import { ThemeProvider } from '../src/context/ThemeContext'
import { SettingsProvider } from '../src/context/SettingsContext'

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <Component {...pageProps} />
      </SettingsProvider>
    </ThemeProvider>
  )
}
```

#### `pages/index.js` - 首页
```jsx
import { useState, useEffect } from 'react'
import { MainContent } from '../src/components/MainContent'
import { LeftSidebar } from '../src/components/LeftSidebar'
import { RightSidebar } from '../src/components/RightSidebar'

export default function Home() {
  const [memos, setMemos] = useState([])
  
  useEffect(() => {
    // 使用新的 API 加载数据
    fetch('/api/memos')
      .then(res => res.json())
      .then(data => setMemos(data.memos))
  }, [])

  return (
    <div className="flex h-screen">
      <LeftSidebar />
      <MainContent memos={memos} />
      <RightSidebar />
    </div>
  )
}
```

### 6. **更新数据服务**

#### `lib/client/apiClient.js` - 新的客户端 API
```jsx
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com'
  : 'http://localhost:3000'

class ApiClient {
  async getMemos(options = {}) {
    const params = new URLSearchParams(options)
    const response = await fetch(`${API_BASE}/api/memos?${params}`)
    return await response.json()
  }

  async createMemo(memo) {
    const response = await fetch(`${API_BASE}/api/memos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memo)
    })
    return await response.json()
  }

  async uploadAttachment(file, memoId) {
    const formData = new FormData()
    formData.append('file', file)
    if (memoId) formData.append('memoId', memoId)

    const response = await fetch(`${API_BASE}/api/attachments`, {
      method: 'POST',
      body: formData
    })
    return await response.json()
  }
}

export const apiClient = new ApiClient()
```

### 7. **启动开发服务器**

```bash
npm run dev
```

访问 `http://localhost:3000` 即可看到迁移后的应用。

---

## 🔧 **关键差异**

### **数据存储**
| 原来 (Vite) | 现在 (Next.js) |
|-------------|-----------------|
| localStorage + IndexedDB | 服务器端 SQLite |
| 浏览器隔离 | 跨浏览器共享 |
| 客户端处理 | 服务器端处理 |

### **API 调用**
```jsx
// 原来
const memos = JSON.parse(localStorage.getItem('memos') || '[]')

// 现在
const response = await fetch('/api/memos')
const { memos } = await response.json()
```

### **文件上传**
```jsx
// 原来
const fileInfo = await largeFileStorage.storeFile(file)

// 现在
const formData = new FormData()
formData.append('file', file)
const response = await fetch('/api/attachments', {
  method: 'POST',
  body: formData
})
const attachment = await response.json()
```

---

## 🚀 **部署选项**

### **1. Vercel (推荐)**
```bash
npm install -g vercel
vercel
```

### **2. 自托管**
```bash
npm run build
npm start
```

### **3. Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📊 **迁移验证**

迁移完成后，验证以下功能：

- [ ] ✅ **跨浏览器数据共享**: 在不同浏览器中查看相同数据
- [ ] ✅ **备忘录 CRUD**: 创建、读取、更新、删除
- [ ] ✅ **文件上传**: 图片和附件上传
- [ ] ✅ **数据导入**: Memos DB 文件导入
- [ ] ✅ **数据导出**: 数据库导出备份
- [ ] ✅ **性能优化**: 页面加载速度
- [ ] ✅ **响应式设计**: 移动端适配

---

## 🛟 **故障排除**

### **常见问题**

1. **端口冲突**
   ```bash
   # 如果 3000 端口被占用
   npm run dev -- -p 3001
   ```

2. **数据库权限**
   ```bash
   # 确保数据目录有写权限
   chmod 755 data/
   ```

3. **文件上传失败**
   ```bash
   # 检查上传目录权限
   mkdir -p data/uploads
   chmod 755 data/uploads
   ```

### **性能优化**

1. **启用 API 缓存**
2. **图片优化** - 使用 Next.js Image 组件
3. **静态生成** - 对于不变的页面

---

## 🎉 **迁移完成**

恭喜！您现在拥有了一个现代化的全栈备忘录应用：

- ✅ **真正的跨浏览器数据共享**
- ✅ **专业的服务器端架构**  
- ✅ **现代化的开发体验**
- ✅ **简单的部署流程**

**下一步**: 考虑添加用户认证、实时同步、PWA 支持等高级功能。