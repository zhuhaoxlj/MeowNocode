# Postman 测试快速指南

## 📋 前置准备

1. 确保已安装 Node.js (v18+)
2. 安装 Postman 桌面应用或使用 Web 版本
3. 项目依赖已安装：`npm install`

---

## 🚀 步骤一：启动 Next.js 后端服务

### 开发模式（推荐）
```bash
npm run dev
```

### 生产模式
```bash
npm run build
npm start
```

启动成功后，你会看到类似输出：
```
✓ Ready on http://localhost:8081
```

**验证服务是否启动**：
在浏览器访问：`http://localhost:8081/api/health`

应该看到：
```json
{
  "status": "ok",
  "timestamp": "2025-10-09T12:00:00.000Z",
  "version": "2.0.0"
}
```

---

## 📥 步骤二：导入 Postman Collection

### 方法一：通过文件导入

1. 打开 Postman
2. 点击左上角 **Import** 按钮
3. 选择 **Upload Files**
4. 选择项目根目录下的 `postman-collection.json` 文件
5. 点击 **Import**

### 方法二：通过拖拽导入

直接将 `postman-collection.json` 文件拖拽到 Postman 窗口

---

## ⚙️ 步骤三：配置环境变量

### 创建环境（可选但推荐）

1. 点击 Postman 右上角的环境下拉菜单
2. 点击 **Environments** → **Create Environment**
3. 命名为 `MeowNocode Local`
4. 添加变量：
   - **变量名**: `baseUrl`
   - **初始值**: `http://localhost:8081`
   - **当前值**: `http://localhost:8081`
5. 点击 **Save**
6. 在右上角环境选择器中选择 `MeowNocode Local`

**注意**：Collection 已经包含了 `{{baseUrl}}` 变量，默认值为 `http://localhost:8081`

---

## 🧪 步骤四：开始测试

### 推荐测试顺序

#### 1️⃣ 健康检查
- 展开 **健康检查** 文件夹
- 点击 **Health Check**
- 点击 **Send**
- 应该返回 200 状态码

#### 2️⃣ 创建备忘录
- 展开 **Memos 备忘录** 文件夹
- 点击 **创建备忘录**
- 查看请求体（可以修改内容）：
  ```json
  {
    "content": "这是一条测试备忘录",
    "tags": ["测试", "示例"],
    "pinned": false
  }
  ```
- 点击 **Send**
- **重要**：复制响应中的 `id` 字段，后续测试会用到

#### 3️⃣ 获取备忘录列表
- 点击 **获取备忘录列表**
- 点击 **Send**
- 查看返回的备忘录数组和分页信息

#### 4️⃣ 获取单个备忘录
- 点击 **获取单个备忘录**
- 在 **Params** 标签中，将 `id` 替换为第2步中复制的 ID
- 点击 **Send**

#### 5️⃣ 更新备忘录
- 点击 **更新备忘录**
- 在 **Params** 标签中，替换 `id` 为实际的备忘录 ID
- 修改请求体中的内容：
  ```json
  {
    "content": "更新后的内容",
    "tags": ["更新", "测试"],
    "pinned": true
  }
  ```
- 点击 **Send**

#### 6️⃣ 上传附件
- 展开 **Attachments 附件** 文件夹
- 点击 **上传附件**
- 在 **Body** 标签中：
  - 点击 `file` 行的 **Select Files**
  - 选择一个图片或文件
  - 在 `memoId` 字段填入实际的备忘录 ID
- 点击 **Send**

#### 7️⃣ 查看统计信息
- 展开 **Statistics 统计** 文件夹
- 点击 **获取所有统计信息**
- 点击 **Send**
- 查看数据库、标签、附件等统计信息

#### 8️⃣ 删除备忘录（可选）
- 点击 **删除备忘录**
- 在 **Params** 标签中替换 `id`
- 点击 **Send**

---

## 🎯 测试技巧

### 1. 使用 Collection Variables
Collection 中已经设置了 `{{baseUrl}}` 变量，如果你改了端口，可以在 Collection 设置中修改。

### 2. 保存常用的测试数据
- 创建备忘录后，将返回的 ID 保存为环境变量：
  - 在响应的 JSON 中右键点击 `id` 字段
  - 选择 **Set as variable** → **Set as new variable**
  - 命名为 `memoId`
  - 在其他请求中使用 `{{memoId}}`

### 3. 批量运行测试
- 点击 Collection 名称旁的 **...** 按钮
- 选择 **Run collection**
- 可以按顺序执行所有请求

### 4. 查看响应
- **Pretty** 标签：格式化的 JSON
- **Raw** 标签：原始响应
- **Preview** 标签：HTML 预览（对于附件等有用）

### 5. 调试技巧
- 打开 **Console**（View → Show Postman Console）
- 查看详细的请求和响应信息
- 检查网络错误

---

## 📝 常见 API 测试场景

### 场景 1：完整的备忘录生命周期
```
1. POST /api/memos - 创建备忘录
2. GET /api/memos/:id - 查看详情
3. PUT /api/memos/:id - 更新内容
4. DELETE /api/memos/:id - 删除
```

### 场景 2：分页测试
```
1. POST /api/memos - 创建多条备忘录（重复多次）
2. GET /api/memos?page=1&limit=5 - 第一页
3. GET /api/memos?page=2&limit=5 - 第二页
```

### 场景 3：附件管理
```
1. POST /api/memos - 创建备忘录
2. POST /api/attachments - 上传附件（关联到备忘录）
3. GET /api/memos/:id - 查看备忘录（包含附件信息）
4. GET /api/attachments/:id - 访问附件
```

### 场景 4：标签筛选
```
1. 创建多条带不同标签的备忘录
2. GET /api/stats?include=tags - 查看标签统计
3. GET /api/memos - 获取所有备忘录，按标签分类
```

---

## 🐛 故障排查

### 问题 1：连接失败
**症状**：`Could not get any response`

**解决方案**：
1. 检查 Next.js 服务是否运行：`curl http://localhost:8081/api/health`
2. 确认端口 8081 没有被其他程序占用
3. 检查防火墙设置

### 问题 2：404 错误
**症状**：`Cannot GET /api/xxx`

**解决方案**：
1. 检查 URL 拼写是否正确
2. 确认 API 路由文件是否存在于 `pages/api/` 目录
3. 查看服务器控制台的错误信息

### 问题 3：500 内部错误
**症状**：`Internal Server Error`

**解决方案**：
1. 查看 Next.js 终端输出的错误日志
2. 检查数据库文件是否存在：`data/meownocode.db`
3. 确认请求体格式正确（JSON 格式，Content-Type 正确）

### 问题 4：文件上传失败
**症状**：`No file provided` 或 `File too large`

**解决方案**：
1. 确认使用了 `multipart/form-data` 格式
2. 检查文件大小（默认限制 100MB）
3. 确认文件字段名为 `file`

---

## 📊 API 响应时间参考

| 接口 | 预期响应时间 | 说明 |
|------|------------|------|
| GET /api/health | < 10ms | 健康检查 |
| GET /api/memos | < 50ms | 获取列表（无附件） |
| POST /api/memos | < 30ms | 创建备忘录 |
| PUT /api/memos/:id | < 30ms | 更新备忘录 |
| DELETE /api/memos/:id | < 30ms | 删除备忘录 |
| POST /api/attachments | 100-500ms | 取决于文件大小 |
| GET /api/stats | < 100ms | 统计信息 |

---

## 🔗 相关文档

- 完整 API 文档：[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Next.js API Routes：https://nextjs.org/docs/api-routes/introduction
- Postman 文档：https://learning.postman.com/

---

## 💡 高级技巧

### 1. 使用 Pre-request Script 自动生成数据
在请求的 **Pre-request Script** 标签添加：
```javascript
// 自动生成随机内容
pm.variables.set("randomContent", "测试备忘录 " + Date.now());

// 生成随机标签
const tags = ["工作", "学习", "生活", "重要"];
const randomTags = [tags[Math.floor(Math.random() * tags.length)]];
pm.variables.set("randomTags", JSON.stringify(randomTags));
```

在请求体中使用：
```json
{
  "content": "{{randomContent}}",
  "tags": {{randomTags}}
}
```

### 2. 使用 Tests 自动验证响应
在请求的 **Tests** 标签添加：
```javascript
// 验证状态码
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// 验证响应时间
pm.test("Response time is less than 200ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(200);
});

// 验证响应体
pm.test("Response has memo object", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('memo');
});

// 保存 ID 到环境变量
if (pm.response.code === 200 || pm.response.code === 201) {
    var jsonData = pm.response.json();
    if (jsonData.memo && jsonData.memo.id) {
        pm.environment.set("memoId", jsonData.memo.id);
    }
}
```

### 3. 性能测试
使用 Collection Runner：
1. 点击 Collection → **Run**
2. 设置 **Iterations** 为 10（运行10次）
3. 设置 **Delay** 为 100ms（请求间隔）
4. 点击 **Run** 查看性能统计

---

## ✅ 检查清单

测试前确认：
- [ ] Next.js 服务已启动（8081 端口）
- [ ] Postman Collection 已导入
- [ ] 环境变量已配置（如果使用）
- [ ] 数据库文件存在或会自动创建
- [ ] `/api/health` 返回正常

开始愉快地测试吧！🎉

