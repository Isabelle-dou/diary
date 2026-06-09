@echo off
chcp 65001 >nul
echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║              启动开发服务器                               ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo 检查 Prisma Client 是否存在...
if exist "node_modules\.prisma\client" (
    echo   ✓ Prisma Client 已生成
) else (
    echo   ✗ Prisma Client 未生成！
    echo.
    echo   请先运行修复脚本：
    echo   fix-prisma-once-and-for-all.bat
    echo.
    pause
    exit /b 1
)
echo.

echo ═══════════════════════════════════════════════════════════════
echo  启动开发服务器...
echo ═══════════════════════════════════════════════════════════════
echo.
echo  访问地址: http://localhost:3000
echo  按 Ctrl+C 停止服务器
echo.

npm run dev
