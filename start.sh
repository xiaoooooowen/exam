#!/bin/bash

# 终端早餐店 - 一键启动脚本

APP_DIR="/home/exam"
PID_FILE="/tmp/breakfast_server.pid"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

start() {
    # 检查是否已运行
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${RED}服务已在运行中 (PID: $PID)${NC}"
            exit 1
        fi
    fi

    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}       终端早餐店 - 多端 TUI 系统${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: 未找到 Node.js，请先安装 Node.js${NC}"
        exit 1
    fi

    echo -e "${YELLOW}启动服务...${NC}"

    # 启动服务器
    cd $APP_DIR
    node src/server/index.js > /tmp/breakfast_server.log 2>&1 &
    SERVER_PID=$!

    echo $SERVER_PID > $PID_FILE

    sleep 1

    # 检查是否启动成功
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo -e "${GREEN}服务已启动 (PID: $SERVER_PID)${NC}"
        echo ""
        echo "连接方式:"
        echo -e "  ${YELLOW}叫号牌端${NC}: nc localhost 8024"
        echo -e "  ${YELLOW}顾客下单${NC}: nc localhost 8025"
        echo -e "  ${YELLOW}店主管理${NC}: nc localhost 8026"
        echo ""
        echo "日志文件: /tmp/breakfast_server.log"
    else
        echo -e "${RED}服务启动失败，请查看日志${NC}"
        exit 1
    fi
}

stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            rm -f $PID_FILE
            echo -e "${GREEN}服务已停止${NC}"
        else
            rm -f $PID_FILE
            echo -e "${YELLOW}服务未运行${NC}"
        fi
    else
        # 尝试查找并终止
        pkill -f "node src/server" 2>/dev/null
        echo -e "${GREEN}服务已停止${NC}"
    fi
}

status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${GREEN}服务运行中 (PID: $PID)${NC}"
            echo ""
            echo "端口监听:"
            netstat -tlnp 2>/dev/null | grep -E "8024|8025|8026" || ss -tlnp | grep -E "8024|8025|8026"
        else
            echo -e "${YELLOW}服务未运行 (PID文件过期)${NC}"
        fi
    else
        # 尝试查找
        PID=$(pgrep -f "node src/server")
        if [ -n "$PID" ]; then
            echo -e "${GREEN}服务运行中 (PID: $PID)${NC}"
        else
            echo -e "${YELLOW}服务未运行${NC}"
        fi
    fi
}

restart() {
    stop
    sleep 1
    start
}

log() {
    if [ -f "/tmp/breakfast_server.log" ]; then
        tail -f /tmp/breakfast_server.log
    else
        echo "日志文件不存在"
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    log)
        log
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|log}"
        echo ""
        echo "命令说明:"
        echo "  start   - 启动服务"
        echo "  stop    - 停止服务"
        echo "  restart - 重启服务"
        echo "  status  - 查看服务状态"
        echo "  log     - 查看服务日志"
        exit 1
        ;;
esac

exit 0