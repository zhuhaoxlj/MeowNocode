#!/bin/bash

# MeowNocode API 测试脚本
# 用于快速验证所有 API 接口是否正常工作

BASE_URL="http://localhost:8081"
echo "🧪 开始测试 MeowNocode API"
echo "📡 Base URL: $BASE_URL"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=${5:-200}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: $name ... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $status_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # 如果是创建备忘录，保存 ID
        if [[ "$name" == *"创建"* ]] && [[ "$body" == *"id"* ]]; then
            MEMO_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
            echo "  📝 Memo ID: $MEMO_ID"
        fi
        
        # 如果是上传附件，保存 ID
        if [[ "$name" == *"附件"* ]] && [[ "$body" == *"id"* ]]; then
            ATTACHMENT_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
            echo "  📎 Attachment ID: $ATTACHMENT_ID"
        fi
        
    else
        echo -e "${RED}✗ FAILED${NC} (Expected HTTP $expected_status, got HTTP $status_code)"
        echo "  Response: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  健康检查测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_api "健康检查" "GET" "/api/health" "" 200

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Memos 接口测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 创建备忘录
test_api "创建备忘录" "POST" "/api/memos" \
    '{"content":"API测试备忘录 - '"$(date)"'","tags":["测试","自动化"],"pinned":false}' \
    201

# 获取备忘录列表
test_api "获取备忘录列表" "GET" "/api/memos?page=1&limit=10" "" 200

# 如果有 MEMO_ID，测试单个备忘录操作
if [ ! -z "$MEMO_ID" ]; then
    test_api "获取单个备忘录" "GET" "/api/memos/$MEMO_ID" "" 200
    
    test_api "更新备忘录" "PUT" "/api/memos/$MEMO_ID" \
        '{"content":"更新后的内容 - '"$(date)"'","tags":["测试","更新"],"pinned":true}' \
        200
fi

# 获取归档备忘录
test_api "获取归档备忘录" "GET" "/api/memos/archived" "" 200

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  统计接口测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_api "获取所有统计" "GET" "/api/stats" "" 200
test_api "获取数据库统计" "GET" "/api/stats?include=database" "" 200
test_api "获取标签统计" "GET" "/api/stats?include=tags" "" 200

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  认证状态测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_api "认证状态检查" "GET" "/api/auth-status" "" 200

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  清理测试（可选）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 询问是否删除测试数据
if [ ! -z "$MEMO_ID" ]; then
    echo -e "${YELLOW}是否删除测试创建的备忘录? (y/n)${NC}"
    read -t 5 -n 1 cleanup
    echo ""
    
    if [ "$cleanup" == "y" ]; then
        test_api "删除测试备忘录" "DELETE" "/api/memos/$MEMO_ID" "" 200
    else
        echo "⏭️  跳过清理，保留测试数据"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 测试结果汇总"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！API 工作正常！${NC}"
    exit 0
else
    echo -e "${RED}❌ 有测试失败，请检查 API 服务${NC}"
    exit 1
fi

