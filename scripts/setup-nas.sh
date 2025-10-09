#!/bin/bash

# MeowNocode NAS 快速部署脚本
# 用于在 NAS 上快速设置和部署应用

set -e  # 遇到错误立即退出

echo "🚀 MeowNocode NAS 部署脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "📁 项目目录: $PROJECT_DIR"
cd "$PROJECT_DIR"

# 1. 检查 Node.js 版本
echo ""
echo "📦 检查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "   请先安装 Node.js 18 或更高版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js 版本过低 ($(node -v))${NC}"
    echo "   建议使用 Node.js 18 或更高版本"
else
    echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"
fi

# 2. 创建数据库目录
echo ""
echo "💾 创建数据库目录..."
mkdir -p memos_db
chmod 755 memos_db
echo -e "${GREEN}✅ 数据库目录已创建${NC}"

# 3. 检查是否需要上传数据库
if [ ! -f "memos_db/memos_dev.db" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  数据库文件不存在${NC}"
    echo "   如果你有现有数据库，请将其上传到 memos_db/memos_dev.db"
    echo "   否则将在首次运行时创建新数据库"
    read -p "   是否继续？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ 数据库文件已存在${NC}"
    chmod 664 memos_db/memos_dev.db
fi

# 4. 清理旧的 node_modules（可选）
echo ""
read -p "🗑️  是否清理并重新安装依赖？这将重新编译 better-sqlite3 (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   清理 node_modules..."
    rm -rf node_modules package-lock.json
    echo -e "${GREEN}✅ 清理完成${NC}"
fi

# 5. 安装依赖
echo ""
echo "📚 安装依赖..."
if [ -d "node_modules" ]; then
    echo "   node_modules 已存在，跳过安装"
    echo "   如需重新安装，请先删除 node_modules 目录"
else
    npm install
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
fi

# 6. 重新编译 better-sqlite3
echo ""
echo "🔧 重新编译 better-sqlite3..."
npm rebuild better-sqlite3
echo -e "${GREEN}✅ better-sqlite3 编译完成${NC}"

# 7. 构建项目
echo ""
read -p "🏗️  是否构建项目？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   构建中..."
    npm run build
    echo -e "${GREEN}✅ 构建完成${NC}"
fi

# 8. 运行诊断
echo ""
echo "🔍 运行诊断..."
npm run diagnose

# 9. 启动选项
echo ""
echo "================================"
echo "✨ 部署完成！"
echo ""
echo "启动选项："
echo "  1. 开发模式:     npm run dev"
echo "  2. 生产模式:     npm start"
echo "  3. 使用 PM2:     pm2 start npm --name meownocode -- start"
echo ""
echo "其他命令："
echo "  - 诊断问题:      npm run diagnose"
echo "  - 查看日志:      pm2 logs meownocode  (如果使用 PM2)"
echo ""
echo "访问地址: http://localhost:8081"
echo "或: http://你的NAS-IP:8081"
echo ""

# 10. 询问是否启动
read -p "🚀 是否现在启动服务？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "选择启动方式："
    echo "  1. 直接启动（前台运行）"
    echo "  2. 使用 PM2（后台运行，推荐）"
    read -p "请选择 (1/2): " -n 1 -r
    echo
    
    if [[ $REPLY == "1" ]]; then
        echo "启动服务..."
        npm start
    elif [[ $REPLY == "2" ]]; then
        if ! command -v pm2 &> /dev/null; then
            echo "安装 PM2..."
            npm install -g pm2
        fi
        echo "使用 PM2 启动服务..."
        pm2 start npm --name "meownocode" -- start
        pm2 save
        echo ""
        echo "PM2 常用命令："
        echo "  - 查看状态: pm2 status"
        echo "  - 查看日志: pm2 logs meownocode"
        echo "  - 停止服务: pm2 stop meownocode"
        echo "  - 重启服务: pm2 restart meownocode"
        echo "  - 删除服务: pm2 delete meownocode"
    fi
else
    echo ""
    echo "稍后可以手动启动："
    echo "  npm start"
    echo "或"
    echo "  pm2 start npm --name meownocode -- start"
fi

echo ""
echo "================================"
echo "📚 更多信息请查看: doc/NAS_DEPLOYMENT_GUIDE.md"

