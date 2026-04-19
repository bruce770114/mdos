#!/bin/bash

# MDOS 启动脚本 (bun 版)
# 用法: ./mdosbun.sh [start|start:fast|stop|restart]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# bun 路径
BUN="${HOME}/.bun/bin/bun"
if [ ! -x "$BUN" ]; then
    echo -e "${RED}错误: 找不到 bun 可执行文件 ($BUN)${NC}"
    echo -e "  请先安装 bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# 等待服务启动
# 参数: $1=端口, $2=名称, $3=可选路径(默认/)
wait_for_service() {
    local port=$1
    local name=$2
    local path=${3:-/}
    local max_attempts=60
    local attempt=0

    echo -n "  等待 $name 启动"
    while [ $attempt -lt $max_attempts ]; do
        local code
        code=$(curl --noproxy localhost,127.0.0.1 -s -o /dev/null -w "%{http_code}" "http://localhost:${port}${path}" 2>/dev/null) || true
        # 任何非 000 的响应码表示服务已就绪（000 = 连接拒绝/超时）
        if [ "$code" != "000" ] && [ -n "$code" ]; then
            echo -e " ${GREEN}OK${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 1
    done
    echo -e " ${RED}超时${NC}"
    return 1
}

# 停止服务函数
stop_service() {
    local port=$1
    local name=$2

    local _code
    _code=$(curl --noproxy localhost,127.0.0.1 -s -o /dev/null -w "%{http_code}" "http://localhost:$port" 2>/dev/null) || true
    if [ "$_code" != "000" ] && [ -n "$_code" ]; then
        echo -e "  ${YELLOW}停止${NC} $name (端口 $port)..."
        pkill -f "vite.*$port" 2>/dev/null || true
        pkill -f "nest.*3001" 2>/dev/null || true
        sleep 1
        fuser -k $port/tcp 2>/dev/null || true
    fi
}

# Docker 管理
start_docker() {
    echo -e "${BLUE}==>${NC} 启动 Docker 容器..."
    cd "$PROJECT_DIR"
    docker-compose up -d
    echo -e "  ${GREEN}Docker 容器已启动${NC}"
}

stop_docker() {
    echo -e "${BLUE}==>${NC} 停止 Docker 容器..."
    cd "$PROJECT_DIR"
    docker-compose down 2>/dev/null || true
    echo -e "  ${GREEN}Docker 容器已停止${NC}"
}

# 启动所有服务
# 参数: $1 - 启动模式 (dev=开发模式带热重载, fast=快速模式用已编译产物)
do_start() {
    local mode=${1:-dev}

    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  启动 MDOS 服务 (bun v$("$BUN" --version))${NC}"
    if [ "$mode" = "fast" ]; then
        echo -e "${GREEN}  (快速模式: 直接运行 dist/main.js)${NC}"
    fi
    echo -e "${GREEN}========================================${NC}\n"

    # 启动 Docker
    start_docker

    # ── 后端 API (端口 3001) ──────────────────────────────────────
    local _api_code
    _api_code=$(curl --noproxy localhost,127.0.0.1 -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/docs 2>/dev/null) || true
    if [ "$_api_code" != "000" ] && [ -n "$_api_code" ]; then
        echo -e "  ${YELLOW}后端 API 已在运行 (端口 3001)${NC}"
    else
        if [ "$mode" = "fast" ]; then
            echo -e "${BLUE}==>${NC} 启动后端 API — 快速模式 (端口 3001)..."
            cd "$PROJECT_DIR/apps/api"
            nohup "$BUN" run dist/main.js > "$PROJECT_DIR/logs/api.log" 2>&1 &
        else
            echo -e "${BLUE}==>${NC} 构建后端 API..."
            cd "$PROJECT_DIR/apps/api"
            "$BUN" run build
            echo -e "${BLUE}==>${NC} 启动后端 API — 开发模式 (端口 3001)..."
            nohup "$BUN" run start:dev > "$PROJECT_DIR/logs/api.log" 2>&1 &
        fi
        echo $! > "$PROJECT_DIR/logs/api.pid"
    fi

    # ── 租户前端 (端口 5173) ──────────────────────────────────────
    local _web_code
    _web_code=$(curl --noproxy localhost,127.0.0.1 -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>/dev/null) || true
    if [ "$_web_code" != "000" ] && [ -n "$_web_code" ]; then
        echo -e "  ${YELLOW}租户前端已在运行 (端口 5173)${NC}"
    else
        echo -e "${BLUE}==>${NC} 启动租户前端 (端口 5173)..."
        cd "$PROJECT_DIR/apps/web"
        nohup "$BUN" run dev > "$PROJECT_DIR/logs/web.log" 2>&1 &
        echo $! > "$PROJECT_DIR/logs/web.pid"
    fi

    # ── 平台管理前台 (端口 5175) ─────────────────────────────────
    local _platform_code
    _platform_code=$(curl --noproxy localhost,127.0.0.1 -s -o /dev/null -w "%{http_code}" http://localhost:5175 2>/dev/null) || true
    if [ "$_platform_code" != "000" ] && [ -n "$_platform_code" ]; then
        echo -e "  ${YELLOW}平台管理前台已在运行 (端口 5175)${NC}"
    else
        echo -e "${BLUE}==>${NC} 启动平台管理前台 (端口 5175)..."
        cd "$PROJECT_DIR/apps/platform-web"
        nohup "$BUN" run dev > "$PROJECT_DIR/logs/platform.log" 2>&1 &
        echo $! > "$PROJECT_DIR/logs/platform.pid"
    fi

    # 等待服务就绪
    echo ""
    wait_for_service 3001 "后端 API" "/api/docs"
    wait_for_service 5173 "租户前端"
    wait_for_service 5175 "平台管理前台"

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  MDOS 启动完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "  ${BLUE}租户前端:${NC}      http://localhost:5173"
    echo -e "  ${BLUE}平台管理前台:${NC}  http://localhost:5175"
    echo -e "  ${BLUE}后端 API:${NC}      http://localhost:3001"
    echo -e "  ${BLUE}API 文档:${NC}      http://localhost:3001/api/docs"
    echo ""
    echo -e "  ${YELLOW}登录凭据:${NC}"
    echo -e "    Tenant Code: DEMO"
    echo -e "    Username:    admin"
    echo -e "    Password:   Admin@123"
    echo ""
}

# 停止所有服务
do_stop() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  停止 MDOS 服务${NC}"
    echo -e "${YELLOW}========================================${NC}\n"

    echo -e "${BLUE}==>${NC} 停止前端和后端进程..."

    # 使用 PID 文件停止进程
    for pidfile in api web platform; do
        local f="$PROJECT_DIR/logs/${pidfile}.pid"
        if [ -f "$f" ]; then
            kill "$(cat "$f")" 2>/dev/null || true
            rm -f "$f"
        fi
    done

    # 兜底：杀掉 vite / nest 残留进程
    pkill -f "vite" 2>/dev/null || true
    pkill -f "nest" 2>/dev/null || true

    # 停止 Docker
    stop_docker

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  MDOS 已停止${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
}

# 重启所有服务
do_restart() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  重启 MDOS 服务${NC}"
    echo -e "${BLUE}========================================${NC}\n"

    do_stop
    echo ""
    sleep 2
    do_start
}

# 显示用法
show_usage() {
    echo "用法: $0 {start|start:fast|stop|restart}"
    echo ""
    echo "命令:"
    echo "  start      - 启动所有 MDOS 服务 (开发模式, 带热重载)"
    echo "  start:fast - 启动所有 MDOS 服务 (快速模式, 直接运行 dist/)"
    echo "  stop       - 停止所有 MDOS 服务"
    echo "  restart    - 重启所有 MDOS 服务"
    echo ""
    echo "运行时: bun $("$BUN" --version 2>/dev/null || echo '未找到')"
    echo ""
}

# 主逻辑
case "$1" in
    start)
        do_start "dev"
        ;;
    start:fast)
        do_start "fast"
        ;;
    stop)
        do_stop
        ;;
    restart)
        do_restart
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

exit 0
