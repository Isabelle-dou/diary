@echo off
chcp 65001 >nul
echo ========================================
echo Prisma Client 强制重新生成工具
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 停止所有 Node.js 进程...
taskkill /f /im node.exe >nul 2>&1
echo   ✓ Node.js 进程已停止
echo.

echo [2/4] 完全清理 Prisma 相关文件...
if exist "node_modules\.prisma" (
    rd /s /q "node_modules\.prisma"
    echo   ✓ 已删除旧的 Prisma Client
)
if exist "prisma\migrations" (
    rd /s /q "prisma\migrations"
    echo   ✓ 已删除旧迁移文件
)
if exist ".next" (
    rd /s /q ".next"
    echo   ✓ 已删除 Next.js 缓存
)
echo.

echo [3/4] 重新初始化数据库...
echo   正在推送数据库变更...
call npx prisma db push --force-reset --accept-data-loss
if errorlevel 1 (
    echo   ✗ 数据库推送失败！
    echo   错误代码: %errorlevel%
    pause
    exit /b 1
)
echo   ✓ 数据库已更新
echo.

echo [4/4] 生成 Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo   ✗ Prisma Client 生成失败！
    echo   错误代码: %errorlevel%
    pause
    exit /b 1
)
echo   ✓ Prisma Client 生成成功
echo.

echo ========================================
echo 修复完成！
echo ========================================
echo.
echo 现在启动开发服务器：
echo   npm run dev
echo.
pause
