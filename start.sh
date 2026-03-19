#!/bin/bash

# 终端早餐店 - 一键启动脚本

echo "================================================"
echo "       终端早餐店 - 多端 TUI 系统"
echo "================================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "启动服务..."

# 启动服务器（后台运行）
node /home/exam/src/server/index.js &

SERVER_PID=$!

echo "服务已启动 (PID: $SERVER_PID)"
echo ""
echo "连接方式:"
echo "  叫号牌端: nc localhost 8024"
echo "  顾客下单: nc localhost 8025"
echo "  店主管理: nc localhost 8026"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 等待退出
trap "kill $SERVER_PID 2>/dev/null; exit" INT TERM

wait $SERVER_PID