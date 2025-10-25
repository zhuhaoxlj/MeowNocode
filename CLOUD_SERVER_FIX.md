# 云主机端口占用问题解决方案

## 当前情况
`lsof -t -i:8081` 返回空，说明：
1. 端口可能已经被释放了
2. 或者系统没有安装 `lsof` 工具

## 解决方案

### 步骤 1：使用 `netstat` 或 `ss` 检查端口

```bash
# 方法 1：使用 netstat
netstat -tulpn | grep 8081

# 方法 2：使用 ss (更现代)
ss -tulpn | grep 8081

# 方法 3：使用 fuser
fuser 8081/tcp
```

### 步骤 2：根据结果处理

#### 情况 A：看到进程信息
```bash
# 如果看到类似这样的输出：
tcp   0   0 :::8081   :::*   LISTEN   12345/node

# 记下 PID（进程ID，这里是 12345），然后杀掉：
kill -9 12345
```

#### 情况 B：没有任何输出（端口已释放）
```bash
# 说明端口已经可用了，直接运行应用
./my_memos.sh
```

### 步骤 3：如果还是报错，使用 fuser

```bash
# 查找并杀掉占用端口的进程（一步完成）
fuser -k 8081/tcp

# 或者分两步
fuser 8081/tcp        # 查找进程
fuser -k 8081/tcp     # 杀掉进程
```

### 步骤 4：更改端口（备选方案）

如果上述方法都不行，直接换个端口：

```bash
# 编辑启动脚本
nano ~/my_memos.sh

# 改成：
NEXT_PUBLIC_API_MODE=remote next dev -p 8082
# 或者
NEXT_PUBLIC_API_MODE=remote next dev -p 3000

# 保存后运行
./my_memos.sh
```

## 一键脚本（推荐）

创建这个智能启动脚本：

```bash
cat > ~/start_memos_safe.sh << 'EOF'
#!/bin/bash

PORT=8081
APP_DIR=~/MeowNocode

# 函数：检查端口
check_port() {
    netstat -tuln 2>/dev/null | grep ":$1 " > /dev/null
    return $?
}

# 函数：释放端口
free_port() {
    echo "🔄 正在释放端口 $1..."
    
    # 方法1: 使用 fuser
    if command -v fuser &> /dev/null; then
        fuser -k $1/tcp 2>/dev/null
        sleep 1
        return
    fi
    
    # 方法2: 使用 lsof
    if command -v lsof &> /dev/null; then
        PID=$(lsof -t -i:$1)
        if [ ! -z "$PID" ]; then
            kill -9 $PID
            sleep 1
            return
        fi
    fi
    
    # 方法3: 使用 netstat
    PID=$(netstat -tulpn 2>/dev/null | grep ":$1 " | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$PID" ]; then
        kill -9 $PID
        sleep 1
        return
    fi
    
    # 方法4: 使用 ss
    PID=$(ss -tulpn 2>/dev/null | grep ":$1 " | awk '{print $7}' | grep -oP '\d+' | head -1)
    if [ ! -z "$PID" ]; then
        kill -9 $PID
        sleep 1
        return
    fi
}

# 主流程
echo "🚀 准备启动 MeowNocode..."

# 检查目录
if [ ! -d "$APP_DIR" ]; then
    echo "❌ 目录不存在: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

# 检查并释放端口
if check_port $PORT; then
    echo "⚠️  端口 $PORT 已被占用"
    free_port $PORT
    
    # 再次检查
    if check_port $PORT; then
        echo "❌ 无法释放端口 $PORT，请手动检查"
        echo "运行: netstat -tulpn | grep $PORT"
        exit 1
    fi
fi

echo "✅ 端口 $PORT 可用"
echo "🎯 启动应用..."
echo ""

# 启动应用
NEXT_PUBLIC_API_MODE=remote next dev -p $PORT
EOF

# 赋予执行权限
chmod +x ~/start_memos_safe.sh

echo "✅ 脚本创建完成！"
echo "运行: ~/start_memos_safe.sh"
```

## 快速诊断命令

```bash
# 1. 查看所有监听的端口
netstat -tuln | grep LISTEN

# 2. 查看所有 node 进程
ps aux | grep node

# 3. 查看所有 Next.js 进程
ps aux | grep "next dev"

# 4. 杀掉所有 node 进程（谨慎使用）
pkill -9 node

# 5. 查看端口占用情况
ss -tulpn | grep 808
```

## 如果系统缺少工具

```bash
# 安装 lsof (Debian/Ubuntu)
sudo apt-get install lsof

# 安装 net-tools (包含 netstat)
sudo apt-get install net-tools

# 安装 iproute2 (包含 ss)
sudo apt-get install iproute2
```

## 最简单的方法

如果端口一直有问题，最简单的解决方案是**重启服务器**：

```bash
sudo reboot
```

然后等待 1-2 分钟后重新连接，再运行应用。

