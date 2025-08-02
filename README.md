# Meow App - 类似于flomo/memos的网页应用

Meow App 是一个简洁的笔记应用，支持本地存储和云端同步。你可以使用Supabase或Cloudflare D1作为云端数据库。

## 环境安装指南

### NVM 安装
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```

### Node.js 16 安装
```
nvm install 16
nvm use 16
```

### 启动开发服务器
```
npm run dev
```

## 部署选项

### 1. 使用Supabase部署

#### 配置Supabase
1. 在 [Supabase](https://supabase.com) 创建一个新项目
2. 获取项目的URL和anon key
3. 在项目根目录创建`.env`文件，添加以下内容：
   ```
   VITE_SUPABASE_URL=你的Supabase项目URL
   VITE_SUPABASE_ANON_KEY=你的Supabase anon key
   ```

#### 初始化数据库
1. 在Supabase控制台的SQL编辑器中运行`supabase-schema.sql`文件
2. 这将创建所需的表和索引

#### 部署应用
你可以将应用部署到任何支持静态网站托管的服务，如Vercel、Netlify等。

### 2. 使用Cloudflare Workers/Pages和D1数据库部署

#### 准备工作
1. 安装Wrangler CLI：
   ```
   npm install -g wrangler
   ```
2. 登录Cloudflare账户：
   ```
   wrangler login
   ```

#### 创建D1数据库
1. 创建一个新的D1数据库：
   ```
   wrangler d1 create meow-app-db
   ```
2. 记下输出的database_id

#### 配置wrangler.toml
1. 编辑`wrangler.toml`文件，将`your-database-id`替换为上一步获取的database_id
2. 根据需要配置自定义域名和环境变量

#### 初始化D1数据库
1. 执行以下命令初始化数据库：
   ```
   wrangler d1 execute meow-app-db --file=./d1-schema.sql --remote
   ```

#### 部署到Cloudflare Workers
1. 构建应用：
   ```
   npm run build
   ```
2. 部署到Cloudflare Workers：
   ```
   wrangler deploy
   ```

#### 部署到Cloudflare Pages
1. 将你的代码推送到GitHub仓库
2. 在Cloudflare控制台中连接你的GitHub仓库
3. 配置构建设置：
   - 构建命令：`npm run build`
   - 构建输出目录：`dist`
4. 确保项目根目录中有一个 `_worker.js` 文件（我们已为你创建好了）：
   - 这个文件的作用是将我们的Worker代码与Cloudflare Pages集成
   - 它导入了`worker.js`中的所有API端点，使前端应用能够通过HTTP请求访问D1数据库
5. 在Pages设置中，添加D1数据库绑定：
   - 变量名：`DB`
   - 数据库：选择你创建的D1数据库
6. 添加环境变量（可选）：
   - `VITE_CF_PAGES`: `true`
   - `VITE_DEPLOYMENT_PLATFORM`: `cloudflare`

## 使用指南

### 云端同步
1. 在应用中打开设置
2. 在"数据"标签页中，启用"云端数据同步"
3. 选择你想要使用的云服务提供商（Supabase或Cloudflare D1）
4. 如果使用Supabase，需要先登录GitHub账号
5. 点击"备份到云端"或"从云端恢复"按钮进行数据同步

### 本地数据管理
1. 在设置中的"数据"标签页，你可以导出和导入本地数据
2. 导出的数据是JSON格式，包含所有想法、标签和设置

## 项目结构
- `src/` - 源代码
  - `components/` - React组件
  - `context/` - React Context
  - `lib/` - 工具库和数据库服务
- `supabase-schema.sql` - Supabase数据库架构
- `d1-schema.sql` - D1数据库架构
- `worker.js` - Cloudflare Worker代码
- `wrangler.toml` - Cloudflare Workers配置
