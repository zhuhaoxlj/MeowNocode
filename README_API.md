# API 配置快速指南

## 快速开始

### 使用本地 API
```bash
bun run dev
```

### 使用远程 API  
```bash
bun run dev:remote
```

## 验证

启动后打开浏览器控制台，会看到：

**本地模式：**
```
🌐 [API Config] 当前模式: 本地 API (baseURL: localhost)
```

**远程模式：**
```
🌐 [API Config] 当前模式: 远程 API (baseURL: http://111.170.174.134:18081)
```

## 配置文件

- **api.config.js** - API 地址配置
- **lib/client/apiClient.js** - API 客户端

## 添加新环境

1. 编辑 `api.config.js`：
```javascript
export const API_CONFIGS = {
  local: { baseURL: '', name: '本地 API' },
  remote: { baseURL: 'http://111.170.174.134:18081', name: '远程 API' },
  staging: { baseURL: 'http://staging.example.com', name: '测试环境' },
};
```

2. 添加启动脚本到 `package.json`：
```json
{
  "scripts": {
    "dev:staging": "NEXT_PUBLIC_API_MODE=staging next dev -p 8081"
  }
}
```

3. 使用：
```bash
bun run dev:staging
```

---

详细文档请查看：[API_CONFIGURATION.md](./API_CONFIGURATION.md)

