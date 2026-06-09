@echo off
chcp 65001 >nul
echo ========================================
echo Prisma 数据库修复工具 v1.0
echo ========================================
echo.

cd /d "%~dp0"

echo [1/6] 检查 Node.js 环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ✗ 未找到 Node.js，请先安装
    pause
    exit /b 1
)
echo   ✓ Node.js 已安装
echo.

echo [2/6] 清理 Next.js 缓存...
if exist ".next" (
    rd /s /q ".next" 2>nul
    echo   ✓ .next 目录已清理
) else (
    echo   - .next 目录不存在，跳过
)
echo.

echo [3/6] 清理 Prisma 缓存...
if exist "node_modules\.prisma" (
    rd /s /q "node_modules\.prisma" 2>nul
    echo   ✓ Prisma Client 缓存已清理
) else (
    echo   - Prisma Client 缓存不存在，跳过
)
echo.

echo [4/6] 重置数据库...
call npx prisma db push --force-reset
if errorlevel 1 (
    echo   ✗ 数据库重置失败！
    echo   请手动运行: npx prisma db push --force-reset
) else (
    echo   ✓ 数据库已重置并推送
)
echo.

echo [5/6] 生成 Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo   ✗ Prisma Client 生成失败！
    echo   请手动运行: npx prisma generate
) else (
    echo   ✓ Prisma Client 已生成
)
echo.

echo [6/6] 完成！
echo.
echo ========================================
echo 修复完成！请按任意键启动开发服务器...
echo ========================================
echo.

pause >nul
echo 启动开发服务器: npx next dev
echo 按 Ctrl+C 停止服务器
echo.

call npx next dev
