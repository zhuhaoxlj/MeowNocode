# API 配置说明

## 概述

本项目支持通过启动命令选择使用本地 API 或远程 API，方便开发和调试。

## 使用方法

### 使用本地 API（默认）

```bash
bun run dev
```

这将使用本地 Next.js API 路由（`http://localhost:8081/api`）

### 使用远程 API

```bash
bun run dev:remote
```

这将使用远程服务器 API（`http://111.170.174.134:18081/api`）

## 配置说明

### api.config.js

API 配置文件位于项目根目录的 `api.config.js`，包含以下配置：

```javascript
export const API_CONFIGS = {
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

### 添加新的 API 环境

如果需要添加其他 API 环境（如测试服务器），按以下步骤操作：

**1. 在 `api.config.js` 中添加配置：**

```javascript
export const API_CONFIGS = {
  local: { ... },
  remote: { ... },
  staging: {
    baseURL: 'http://your-staging-server.com:8081',
    name: '测试服务器 API',
  },
};
```

**2. 在 `package.json` 中添加启动脚本：**

```json
{
  "scripts": {
    "dev:staging": "NEXT_PUBLIC_API_MODE=staging next dev -p 8081"
  }
}
```

**3. 使用：**

```bash
bun run dev:staging
```

## 工作原理

1. **环境变量控制**：通过 `NEXT_PUBLIC_API_MODE` 环境变量指定使用哪个 API
2. **启动时确定**：配置在启动时就确定，无需在浏览器中切换
3. **控制台提示**：开发环境启动时会在控制台显示当前使用的 API

## 验证配置

启动后，打开浏览器控制台，你会看到：

### 本地 API 模式
```
🌐 [API Config] 当前模式: 本地 API (baseURL: localhost)
🌐 [ApiClient] 初始化完成
   模式: 本地 API
   Base URL: http://localhost:8081
```

### 远程 API 模式
```
🌐 [API Config] 当前模式: 远程 API (baseURL: http://111.170.174.134:18081)
🌐 [ApiClient] 初始化完成
   模式: 远程 API
   Base URL: http://111.170.174.134:18081
```

## 常见问题

### Q: 如何知道当前使用的是哪个 API？

A: 启动后查看浏览器控制台的输出信息，或查看 Network 面板中请求的 URL。

### Q: 如何切换 API？

A: 停止当前服务器，使用不同的启动命令重新启动：
- 切换到本地：`bun run dev`
- 切换到远程：`bun run dev:remote`

### Q: 远程 API 连接失败怎么办？

A: 请检查：
1. 远程服务器是否正常运行
2. 网络是否可以访问 `http://111.170.174.134:18081`
3. 防火墙是否允许访问
4. 浏览器控制台是否有 CORS 错误

### Q: 生产环境如何配置？

A: 生产环境通过环境变量 `NEXT_PUBLIC_API_URL` 配置 API 地址。

