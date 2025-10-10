# 快速调试指南

## 问题：99条时顺序不对

### 调试步骤

1. **重启服务器**
   ```bash
   # Ctrl+C 停止当前服务器
   npm run dev
   ```

2. **清除浏览器缓存**
   - Chrome/Edge: `Cmd + Shift + R` (Mac) 或 `Ctrl + Shift + R` (Windows)
   - 或者：打开开发者工具（F12） → Network标签 → 勾选"Disable cache"

3. **打开浏览器控制台**
   - 按 `F12` 或 `Cmd + Option + I` (Mac)
   - 切换到 "Console" 标签

4. **重现问题**
   ```
   a. 打开应用
   b. 滚动到底部，加载到99条
   c. 查看控制台日志，应该看到：
      🔄 重置页面 - regular: 49条, pinned: 1条
         前3条: [ID133(...), ID132(...), ID131(...)]
      📄 追加第2页 - 新增: 50条, 总计: 99条
         新增前3条: [ID57(...), ID56(...), ID55(...)]
         追加后前5条: [ID133(...), ID132(...), ...]
   
   d. 点击某个memo的复选框（比如ID133）
   e. 查看控制台日志，应该看到：
      ✏️ 原地更新 ID133 - created_ts: 2025-10-10...
         更新后前5条: [ID133(...), ID132(...), ...]
   
   f. 刷新页面（Cmd + R）
   g. 再次查看控制台日志
   ```

### 预期日志

**正确的情况**：
```
🔄 重置页面 - regular: 49条, pinned: 1条
   前3条: [ID133(2025-10-10), ID132(2025-10-10), ID131(2025-10-10)]

📄 追加第2页 - 新增: 50条, 总计: 99条
   新增前3条: [ID57(2025-09-02), ID56(2025-09-02), ID55(2025-09-02)]
   追加后前5条: [ID133(2025-10-10), ID132(2025-10-10), ID131(2025-10-10), ID128(2025-10-10), ID122(2025-10-10)]
```

**错误的情况**：
```
如果"追加后前5条"中ID57在ID133前面，那就是有问题！
```

### 检查数据库

```bash
cd /Users/mark/100-Project/11-HTML/MeowNocode

# 查看前10条数据的顺序
sqlite3 memos_db/memos_dev.db "
SELECT 
  ROW_NUMBER() OVER (ORDER BY CASE WHEN o.pinned = 1 THEN 0 ELSE 1 END, m.created_ts DESC) as num,
  m.id, 
  o.pinned,
  substr(m.content, 1, 30) as content,
  datetime(m.created_ts, 'unixepoch', 'localtime') as created
FROM memo m 
LEFT JOIN memo_organizer o ON m.id = o.memo_id 
WHERE m.creator_id = 1 AND m.row_status = 'NORMAL' 
ORDER BY CASE WHEN o.pinned = 1 THEN 0 ELSE 1 END, m.created_ts DESC 
LIMIT 10;
"
```

### 检查API响应

```bash
# 第一页
curl -s "http://localhost:8081/api/memos?page=1&limit=5" | jq -r '.memos[] | "\(.id)|\(.pinned)|\(.content[0:25])|\(.created_ts)"'

# 第二页
curl -s "http://localhost:8081/api/memos?page=2&limit=5" | jq -r '.memos[] | "\(.id)|\(.pinned)|\(.content[0:25])|\(.created_ts)"'
```

### 检查索引

```bash
sqlite3 memos_db/memos_dev.db "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'memo' AND name LIKE 'idx_memo%';"
```

应该看到：
```
idx_memo_created_ts|CREATE INDEX idx_memo_created_ts ON memo(created_ts DESC)
idx_memo_creator_status|CREATE INDEX idx_memo_creator_status ON memo(creator_id, row_status, created_ts DESC)
```

### 如果还是有问题

1. **重新运行索引修复脚本**
   ```bash
   node scripts/fix-memo-indexes.js
   ```

2. **检查是否有旧的 Service Worker**
   - 打开开发者工具 → Application 标签 → Service Workers
   - 如果有，点击 "Unregister"

3. **完全清除浏览器数据**
   - Chrome: 设置 → 隐私和安全 → 清除浏览数据
   - 选择"全部时间"
   - 勾选"缓存的图片和文件"
   - 点击"清除数据"

4. **尝试隐身模式**
   - `Cmd + Shift + N` (Mac) 或 `Ctrl + Shift + N` (Windows)
   - 在隐身窗口中打开 `http://localhost:8081`

---

📝 **请把控制台日志截图或复制出来，这样我能看到实际发生了什么！**

