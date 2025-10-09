# API 切换快速指南 🚀

## 快速开始

### 1️⃣ 启动开发服务器

```bash
bun run dev
```

### 2️⃣ 切换 API

页面右下角会出现一个紫色按钮 **🌐 本地 API**

#### 方式 A：使用可视化按钮（最简单）

1. 点击右下角的紫色按钮
2. 在弹出的菜单中选择 **远程 API**
3. 页面自动刷新，切换完成！✅

#### 方式 B：使用浏览器控制台

打开控制台（F12），输入：

```javascript
// 切换到远程 API
localStorage.setItem('API_MODE', 'remote');
location.reload();

// 切换回本地 API  
localStorage.setItem('API_MODE', 'local');
location.reload();
```

## 验证是否切换成功

### 查看控制台输出

切换后刷新页面，控制台会显示：

```
🌐 使用 远程 API: http://111.170.174.134:18081
```

或

```
🌐 使用 本地 API: 本地 Next.js API
```

### 查看网络请求

打开 DevTools → Network 标签页，查看请求 URL：

- **远程 API**: `http://111.170.174.134:18081/api/memos`
- **本地 API**: `http://localhost:8081/api/memos`

## 注意事项

⚠️ **远程 API 使用前提**：
- 远程服务器需要正常运行
- 网络可以访问 `http://111.170.174.134:18081`
- 远程服务器已配置 CORS 允许跨域请求

💡 **提示**：
- 配置会保存在浏览器中，下次打开页面时自动应用
- 只在开发环境显示切换按钮，生产环境不会显示
- 无需重启服务器，刷新页面即可切换

## 完整功能

详细配置和高级功能请查看 [API_CONFIGURATION.md](./API_CONFIGURATION.md)

