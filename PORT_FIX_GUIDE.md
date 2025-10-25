# 解决端口占用问题

## 问题
```
Error: listen EADDRINUSE: address already in use :::8081
```

端口 8081 已经被其他进程占用。

## 解决方案

### 方案 1：找出并杀掉占用端口的进程（推荐）

```bash
# 1. 查找占用 8081 端口的进程
lsof -i :8081

# 或者使用（如果 lsof 不可用）
netstat -tulpn | grep :8081

# 或者使用（更现代的方式）
ss -tulpn | grep :8081

# 2. 你会看到类似这样的输出：
# COMMAND   PID       USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node      12345     user   21u  IPv6 123456      0t0  TCP *:8081 (LISTEN)
#           ^^^^^ 这是进程 ID

# 3. 杀掉该进程
kill -9 12345  # 替换为实际的 PID

# 4. 验证端口已释放
lsof -i :8081
# 应该没有输出

# 5. 重新运行应用
./my_memos.sh
```

### 方案 2：一键杀掉占用端口的进程

```bash
# 创建一个便捷脚本
cat > ~/kill_port.sh << 'EOF'
#!/bin/bash
PORT=$1
if [ -z "$PORT" ]; then
  echo "用法: ./kill_port.sh <端口号>"
  exit 1
fi

PID=$(lsof -t -i:$PORT)
if [ -z "$PID" ]; then
  echo "端口 $PORT 没有被占用"
else
  echo "发现进程 $PID 占用端口 $PORT，正在终止..."
  kill -9 $PID
  echo "已终止进程 $PID"
fi
EOF

# 赋予执行权限
chmod +x ~/kill_port.sh

# 使用
~/kill_port.sh 8081
```

### 方案 3：使用其他端口

修改 `my_memos.sh` 文件，使用未被占用的端口：

```bash
# 编辑脚本
nano ~/my_memos.sh

# 将端口改为其他值，例如 8082, 8083, 3000 等
NEXT_PUBLIC_API_MODE=remote next dev -p 8082

# 保存后运行
./my_memos.sh
```

### 方案 4：检查是否有僵尸进程

```bash
# 查看所有 node 进程
ps aux | grep node

# 查看所有 Next.js 进程
ps aux | grep next

# 杀掉所有 node 进程（谨慎使用！）
pkill -9 node

# 或者更安全的方式，只杀掉特定的
killall -9 node
```

### 方案 5：修改启动脚本，自动处理端口冲突

更新 `my_memos.sh`：

```bash
#!/bin/bash

PORT=8081

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "端口 $PORT 已被占用，正在释放..."
    kill -9 $(lsof -t -i:$PORT)
    sleep 1
fi

# 启动应用
echo "在端口 $PORT 启动应用..."
NEXT_PUBLIC_API_MODE=remote next dev -p $PORT
```

## 常见原因

### 1. 之前的进程没有正常关闭
```bash
# Ctrl+C 可能没有完全终止进程
# 解决：使用 kill -9 强制终止
```

### 2. 多个终端会话运行了相同的应用
```bash
# 检查所有终端
ps aux | grep "next dev"

# 杀掉所有
pkill -f "next dev"
```

### 3. 使用 PM2 或其他进程管理器
```bash
# 如果使用 PM2
pm2 list
pm2 stop all
pm2 delete all

# 如果使用 systemd
sudo systemctl status meownocode
sudo systemctl stop meownocode
```

## 快速命令参考

```bash
# 一行命令解决（推荐）
kill -9 $(lsof -t -i:8081) && ./my_memos.sh

# 或者
fuser -k 8081/tcp && ./my_memos.sh

# 查看所有监听的端口
netstat -tuln | grep LISTEN

# 查看进程树
pstree -p | grep node
```

## 预防措施

### 1. 优雅关闭应用
```bash
# 不要直接关闭终端
# 先按 Ctrl+C 停止应用
# 等待几秒让进程完全退出
# 然后再关闭终端
```

### 2. 使用进程管理器
```bash
# 安装 PM2
npm install -g pm2

# 创建 PM2 配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'meownocode',
    script: 'node_modules/.bin/next',
    args: 'dev -p 8081',
    env: {
      NEXT_PUBLIC_API_MODE: 'remote'
    }
  }]
}
EOF

# 启动
pm2 start ecosystem.config.js

# 停止
pm2 stop meownocode

# 重启
pm2 restart meownocode

# 查看日志
pm2 logs meownocode
```

### 3. 添加端口检测到脚本
```bash
#!/bin/bash
PORT=8081

# 函数：检查端口是否可用
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 1  # 端口被占用
    else
        return 0  # 端口可用
    fi
}

# 函数：释放端口
free_port() {
    echo "释放端口 $1..."
    kill -9 $(lsof -t -i:$1) 2>/dev/null
    sleep 1
}

# 主逻辑
if ! check_port $PORT; then
    echo "⚠️  端口 $PORT 已被占用"
    read -p "是否要终止占用进程？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        free_port $PORT
    else
        echo "❌ 取消启动"
        exit 1
    fi
fi

echo "✅ 端口 $PORT 可用，启动应用..."
NEXT_PUBLIC_API_MODE=remote next dev -p $PORT
```

## 故障排查

如果上述方法都不行：

```bash
# 1. 重启服务器（最后手段）
sudo reboot

# 2. 检查防火墙
sudo ufw status
sudo iptables -L -n

# 3. 检查是否是权限问题
# 端口 < 1024 需要 root 权限
# 使用 > 1024 的端口（如 8081）不需要 sudo

# 4. 检查系统资源
free -h
df -h
top
```

