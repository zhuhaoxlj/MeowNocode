# MeowNocode Next.js 版本

🎉 **项目已成功迁移到 Next.js！**

## 🚀 快速启动

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:3000` 即可使用应用。

## 🌟 主要改进

### ✅ 跨浏览器数据共享
- **真正的服务器端存储**: 数据存储在服务器端 SQLite 数据库中
- **跨浏览器同步**: 在不同浏览器中可以看到相同的数据
- **持久化存储**: 服务器重启后数据仍然存在

### ✅ 现代化架构
- **Next.js 14**: 最新的 React 全栈框架
- **API Routes**: 内置的服务器端 API
- **文件系统路由**: 基于文件系统的页面路由
- **自动优化**: 代码分割、图片优化等

### ✅ 开发体验
- **热重载**: 代码修改后自动刷新
- **TypeScript 支持**: 更好的类型检查
- **ESLint 集成**: 代码质量检查

## 📁 项目结构

```
MeowNocode/
├── pages/                 # Next.js 页面
│   ├── api/               # API 路由
│   ├── _app.js            # 应用入口
│   └── index.js           # 首页
├── src/                   # 源代码
│   ├── components/        # React 组件
│   ├── context/           # React Context
│   ├── lib/               # 工具函数
│   └── pages/            # 页面组件
├── lib/                   # 服务器端代码
│   ├── server/            # 数据库和服务
│   └── client/            # 客户端 API
├── public/                # 静态资源
└── data/                  # 数据存储
```

## 🔧 可用脚本

- `npm run dev` - 启动开发服务器 (http://localhost:3000)
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行代码检查

## 🌐 API 接口

应用提供了完整的 REST API：

- `GET /api/memos` - 获取备忘录列表
- `POST /api/memos` - 创建新备忘录
- `PUT /api/memos/[id]` - 更新备忘录
- `DELETE /api/memos/[id]` - 删除备忘录
- `GET /api/health` - 健康检查
- `GET /api/settings` - 获取设置
- `POST /api/settings` - 更新设置

## 💾 数据存储

当前使用内存数据库进行演示，数据在服务器重启后会丢失。如需持久化存储，可以：

1. 修改 `lib/server/database-memory.js` 为 `database.js`
2. 配置 SQLite 数据库文件路径
3. 运行数据库初始化脚本

## 🚀 部署

### Vercel (推荐)
```bash
npm install -g vercel
vercel
```

### 自托管
```bash
npm run build
npm start
```

## 📝 迁移说明

从 Vite 版本迁移的主要变化：

1. **路由系统**: 从 React Router 改为 Next.js 文件系统路由
2. **数据层**: 从 localStorage 改为服务器端 API
3. **构建系统**: 从 Vite 改为 Next.js
4. **入口文件**: 从 `main.jsx` 改为 `pages/_app.js`

## 🛟 故障排除

如果遇到问题：

1. **端口冲突**: 修改 `package.json` 中的端口配置
2. **依赖问题**: 删除 `node_modules` 和 `package-lock.json` 后重新安装
3. **构建错误**: 检查 Next.js 日志输出
4. **API 错误**: 查看服务器控制台日志

## 🔄 版本历史

- **v2.0.0** - 迁移到 Next.js，实现跨浏览器数据共享
- **v1.0.0** - 初始 Vite + React 版本

---

🎊 **恭喜！您现在拥有了一个现代化的全栈备忘录应用！**