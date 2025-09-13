#!/bin/bash
# 部署 MeowNocode 后端到 Cloudflare Workers

set -e

echo "🚀 开始部署 MeowNocode 后端..."

# 检查必要的工具
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI 未安装，请运行: npm install -g wrangler"
    exit 1
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "🔐 请先登录 Cloudflare:"
    wrangler login
fi

# 检查配置文件
if [ ! -f "wrangler.toml" ]; then
    echo "❌ wrangler.toml 配置文件不存在"
    exit 1
fi

# 创建 D1 数据库（如果不存在）
echo "📊 检查 D1 数据库..."
DB_NAME="meownocode"

# 尝试创建数据库（如果已存在会报错但不影响）
wrangler d1 create $DB_NAME || echo "数据库可能已存在，继续..."

# 获取数据库 ID
DB_ID=$(wrangler d1 list --output=json | jq -r ".[] | select(.name==\"$DB_NAME\") | .uuid")

if [ -z "$DB_ID" ] || [ "$DB_ID" = "null" ]; then
    echo "❌ 无法获取数据库 ID"
    exit 1
fi

echo "✅ 数据库 ID: $DB_ID"

# 更新 wrangler.toml 中的数据库 ID
sed -i.bak "s/database_id = \".*\"/database_id = \"$DB_ID\"/" wrangler.toml

# 执行数据库迁移
echo "📋 执行数据库初始化..."
wrangler d1 execute $DB_NAME --file=d1-schema.sql

# 创建 R2 存储桶（如果不存在）
echo "🪣 检查 R2 存储桶..."
BUCKET_NAME="meownocode-files"

# 尝试创建存储桶
wrangler r2 bucket create $BUCKET_NAME || echo "存储桶可能已存在，继续..."

# 部署 Worker
echo "⚡ 部署 Cloudflare Worker..."
wrangler deploy

# 获取部署后的域名
WORKER_URL=$(wrangler whoami --output=json | jq -r '.username' | sed 's/^/https:\/\/meownocode-api./' | sed 's/$/.workers.dev/')

echo ""
echo "🎉 部署完成！"
echo "📊 数据库: $DB_NAME ($DB_ID)"
echo "🪣 存储桶: $BUCKET_NAME"
echo "🌐 API 地址: $WORKER_URL"
echo ""
echo "💡 接下来："
echo "1. 更新前端 API 配置中的 Worker URL"
echo "2. 访问 $WORKER_URL/api/v1/health 检查服务状态"
echo "3. 运行前端应用进行测试"