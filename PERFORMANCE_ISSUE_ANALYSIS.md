# 性能问题分析：为什么你的 Memo 加载慢

## 数据库结构对比

### Memos 原生架构

```
┌─────────────────────────────────────────┐
│ memo 表                                 │
├─────────────────────────────────────────┤
│ id: 1                                   │
│ content: "今天天气不错"  ← 仅 7 字节     │
│ created_ts: 1756823600                  │
└─────────────────────────────────────────┘
              ↓ (关联)
┌─────────────────────────────────────────┐
│ resource 表                             │
├─────────────────────────────────────────┤
│ id: 1                                   │
│ memo_id: 1                              │
│ filename: "photo.jpg"                   │
│ blob: [二进制数据]  ← 678KB 独立存储    │
│ type: "image/jpeg"                      │
│ size: 678197                            │
└─────────────────────────────────────────┘
```

### MeowNocode 当前架构（问题所在）

```
┌──────────────────────────────────────────────────┐
│ memos 表（你的数据库）                            │
├──────────────────────────────────────────────────┤
│ id: 1                                            │
│ content: "今天天气不错                            │
│   ![image](data:image/jpeg;base64,/9j/4AAQ...    │
│   ...长达 900KB 的 base64 字符串...)"            │
│                     ↑                             │
│              图片嵌入在 content 中！              │
└──────────────────────────────────────────────────┘
```

## 加载性能对比

### Memos 加载流程（快 ⚡）

```
1. 查询 memo 表
   SELECT id, content, created_ts FROM memo LIMIT 20;
   ↓ 返回 ~1KB 数据

2. 显示文本内容
   ✅ 立即显示

3. 用户滚动到图片位置时，才加载
   SELECT blob FROM resource WHERE memo_id = 1;
   ↓ 按需加载 678KB

总耗时: ~50ms（查询） + 按需加载
```

### MeowNocode 加载流程（慢 🐢）

```
1. 查询 memos 表
   SELECT * FROM memos LIMIT 20;
   ↓ 返回 900KB × 20 = 18MB 数据！

2. 传输巨大的 JSON
   {
     "memos": [
       { "content": "文字+900KB的base64..." },
       { "content": "文字+900KB的base64..." },
       ...
     ]
   }
   ↓ 网络传输 18MB

3. 浏览器解析巨大字符串
   ↓ 内存消耗大，解析慢

4. 渲染 base64 图片
   ↓ DOM 操作慢

总耗时: ~2-5秒（甚至更久）
```

## 实际测试

### Memos 数据库统计
```bash
$ sqlite3 memos_dev.db "SELECT COUNT(*), SUM(size), AVG(size) FROM resource;"
# 结果：
# - 8 个附件
# - 总大小：5.4MB
# - 平均大小：678KB
```

### 内容大小对比
```
Memos 创建的 memo:
- content 字段：< 100 字节（纯文本）
- 图片存储：resource.blob（二进制，独立查询）

你创建的 memo:
- content 字段：900KB+（文本 + base64 图片）
- 图片存储：嵌入在 content 中
```

## 为什么会这样？

### Base64 的代价

```javascript
// 原始图片：678KB
const imageFile = new File(...); // 678KB

// 转换为 base64
const base64 = await fileToBase64(imageFile);
// 大小变为：678KB × 1.33 ≈ 902KB ❌

// 嵌入 JSON 后
const json = JSON.stringify({ content: `![img](${base64})` });
// 需要转义，大小进一步增加 ❌
```

### 数据库查询开销

```sql
-- Memos 方式（快）
SELECT id, content FROM memo WHERE id = 1;
-- 返回: 100 字节

-- 你的方式（慢）
SELECT * FROM memos WHERE id = 1;
-- 返回: 900KB
```

### 网络传输开销

```
Memos API 响应:
{
  "memos": [{
    "id": 1,
    "content": "今天天气不错",
    "resources": ["/api/resources/123"]  ← 仅引用
  }]
}
大小: ~1KB

你的 API 响应:
{
  "memos": [{
    "id": 1,
    "content": "今天天气不错![img](data:image/jpeg;base64,/9j/4AAQ...)"
  }]
}
大小: ~900KB
```

## 解决方案

### 🎯 推荐：实现附件系统（彻底解决）

参考 memos 的架构，分离内容和附件：

```javascript
// 1. 创建附件表
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  memo_id INTEGER,
  filename TEXT,
  data BLOB,      -- 二进制存储
  type TEXT,
  size INTEGER,
  created_at INTEGER
);

// 2. 粘贴时上传附件
const handlePaste = async (file) => {
  // 上传为二进制
  const arrayBuffer = await file.arrayBuffer();
  const response = await fetch('/api/attachments', {
    method: 'POST',
    body: arrayBuffer,
    headers: {
      'Content-Type': file.type,
      'X-Filename': file.name
    }
  });
  
  const { id } = await response.json();
  
  // 只在 content 中保存引用
  insertText(`![${file.name}](/api/attachments/${id})`);
};

// 3. Memo 结构
{
  id: 1,
  content: "今天天气不错 ![photo](/api/attachments/abc123)",
  // 附件独立存储，按需加载
}
```

### 📊 性能提升预期

| 指标 | 当前 | 优化后 | 提升 |
|------|------|--------|------|
| 单个 memo 大小 | 900KB | < 1KB | **99.9%** |
| 20 条 memo 加载 | 18MB | 20KB | **99.9%** |
| 首屏加载时间 | 2-5秒 | 50-100ms | **95%+** |
| 内存占用 | 高 | 低 | **90%+** |
| 数据库大小 | 大 | 中 | **30%** |

## 下一步

1. **立即**：重启服务器使 10MB 限制生效（临时方案）
2. **今天/明天**：实现附件系统（长期方案）

要我帮你实现附件系统吗？

