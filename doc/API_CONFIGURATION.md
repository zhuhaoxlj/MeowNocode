# API 配置说明

## 概述

本项目支持在开发环境中灵活切换本地 API 和远程 API，方便开发和调试。

## 使用方法

### 方法 1: 使用可视化切换按钮（推荐）✨

开发环境启动后，页面右下角会显示一个紫色的 API 切换按钮：

1. 点击右下角的 **🌐 本地 API** 或 **🌐 远程 API** 按钮
2. 选择你想使用的 API 环境
3. 页面会自动刷新并应用新配置

### 方法 2: 使用浏览器控制台

在浏览器开发者工具控制台中执行：

```javascript
// 切换到远程 API
localStorage.setItem('API_MODE', 'remote');
location.reload();

// 切换到本地 API
localStorage.setItem('API_MODE', 'local');
location.reload();
```

### 方法 3: 使用启动脚本

```bash
# 使用本地 API（默认）
bun run dev

# 使用远程 API
bun run dev:remote
```

## 配置说明

### api.config.js

API 配置文件位于项目根目录的 `api.config.js`，包含以下配置：

```javascript
const API_CONFIGS = {
  local: {
    baseURL: '',  // 本地 Next.js API
    name: '本地 API',
  },
  remote: {
    baseURL: 'http://111.170.174.134:18081',
    name: '远程 API',
  },
};
```

### lib/client/apiClient.js

实际的 API 客户端位于 `lib/client/apiClient.js`，它会自动读取 `api.config.js` 的配置。

### 添加新的 API 配置

如果需要添加其他 API 地址，可以在 `api.config.js` 中添加新配置：

```javascript
const API_CONFIGS = {
  local: { ... },
  remote: { ... },
  staging: {
    baseURL: 'http://your-staging-server.com:8081',
    name: '测试服务器 API',
  },
};
```

然后在 `package.json` 中添加对应的脚本：

```json
{
  "scripts": {
    "dev:staging": "NEXT_PUBLIC_API_MODE=staging next dev -p 8081"
  }
}
```

## 工作原理

1. **环境变量控制**：通过 `NEXT_PUBLIC_API_MODE` 环境变量来指定使用哪个 API 配置
2. **自动配置**：`nextApiClient.js` 会根据配置自动选择对应的 baseURL
3. **开发提示**：开发环境启动时会在控制台显示当前使用的 API 配置

## 注意事项

1. **生产环境**：生产环境仍然使用 `NEXT_PUBLIC_API_URL` 环境变量
2. **CORS 问题**：使用远程 API 时，确保远程服务器配置了正确的 CORS 策略
3. **网络访问**：使用远程 API 时需要确保网络可以访问远程服务器

## 常见问题

### Q: 如何知道当前使用的是哪个 API？

A: 有以下几种方式：
1. **查看右下角按钮**：按钮上会显示当前使用的 API（如 "🌐 远程 API"）
2. **查看控制台**：启动时会显示类似信息：
   ```
   🌐 使用 远程 API: http://111.170.174.134:18081
   ```
3. **查看 Network 面板**：查看请求的 URL 地址

### Q: 切换 API 后需要重启服务器吗？

A: 不需要！
- 使用可视化按钮切换：会自动刷新页面
- 使用控制台切换：手动刷新页面即可（`F5` 或 `Cmd+R`）
- 配置保存在浏览器 localStorage 中，刷新页面即可生效

### Q: 远程 API 连接失败怎么办？

A: 请检查：
1. 远程服务器是否正常运行
2. 网络是否可以访问远程服务器（`http://111.170.174.134:18081`）
3. 防火墙是否允许访问
4. 查看浏览器控制台是否有 CORS 错误

### Q: 切换按钮在生产环境会显示吗？

A: 不会。切换按钮仅在开发环境（`NODE_ENV=development`）显示，生产环境自动隐藏。

### Q: 如何在代码中获取当前 API 配置？

A: 使用 api.config.js 提供的方法：
```javascript
import { getCurrentApiMode, getApiConfig } from './api.config';

// 获取当前模式
const mode = getCurrentApiMode(); // 'local' 或 'remote'

// 获取当前配置
const config = getApiConfig(); // { baseURL: '...', name: '...' }
```

