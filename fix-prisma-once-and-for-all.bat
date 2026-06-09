@echo off
chcp 65001 >nul
echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║         头像上传功能 - Prisma 修复工具                     ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/6] 检查环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ✗ Node.js 未安装！
    echo   请先安装 Node.js 18+: https://nodejs.org/
    pause
    exit /b 1
)
echo   ✓ Node.js 已安装
echo.

echo [2/6] 停止开发服务器...
taskkill /f /im node.exe >nul 2>&1
echo   ✓ 已停止 Node.js 进程
echo.

echo [3/6] 清理缓存文件...
if exist ".next" (
    rd /s /q ".next" 2>nul
    echo   ✓ 已删除 .next 目录
)
if exist "node_modules\.prisma" (
    rd /s /q "node_modules\.prisma" 2>nul
    echo   ✓ 已删除旧的 Prisma Client
)
echo   ✓ 缓存已清理
echo.

echo [4/6] 推送数据库变更到 SQLite...
call npx prisma db push --force-reset --accept-data-loss
if errorlevel 1 (
    echo.
    echo   ═══════════════════════════════════════════════════════
    echo   ✗ 数据库推送失败！
    echo   ═══════════════════════════════════════════════════════
    echo.
    echo   请尝试手动执行以下命令：
    echo   1. cd /d D:\code\trae\diary_English
    echo   2. npx prisma db push --force-reset
    echo.
    pause
    exit /b 1
)
echo   ✓ 数据库已更新
echo.

echo [5/6] 重新生成 Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo.
    echo   ═══════════════════════════════════════════════════════
    echo   ✗ Prisma Client 生成失败！
    echo   ═══════════════════════════════════════════════════════
    echo.
    echo   请尝试手动执行：
    echo   1. cd /d D:\code\trae\diary_English
    echo   2. npx prisma generate
    echo.
    pause
    exit /b 1
)
echo   ✓ Prisma Client 生成成功
echo.

echo [6/6] 验证 node_modules/.prisma 目录...
if exist "node_modules\.prisma\client" (
    echo   ✓ Prisma Client 目录存在
) else (
    echo   ! Prisma Client 可能未正确生成
)
echo.

echo ═══════════════════════════════════════════════════════════════
echo  ✓ 修复完成！
echo ═══════════════════════════════════════════════════════════════
echo.
echo 现在请启动开发服务器：
echo   npm run dev
echo.
echo 或者双击运行：start-dev.bat
echo.
pause
