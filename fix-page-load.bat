@echo off
chcp 65001 >nul
echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║              页面加载失败修复工具                          ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/5] 诊断当前状态...
node diagnose-page-load.js
if errorlevel 1 (
    echo.
    echo   ═══════════════════════════════════════════════════════
    echo   检测到问题，开始修复...
    echo   ═══════════════════════════════════════════════════════
    echo.
)

echo [2/5] 清理缓存...
if exist ".next" (
    rd /s /q ".next"
    echo   ✓ 已清理 Next.js 构建缓存
)

if exist "node_modules\.prisma" (
    rd /s /q "node_modules\.prisma"
    echo   ✓ 已清理 Prisma Client 缓存
)
echo.

echo [3/5] 重置数据库...
call npx prisma db push --force-reset --accept-data-loss
if errorlevel 1 (
    echo.
    echo   ✗ 数据库重置失败！
    echo   请检查数据库文件是否被占用，然后重试
    echo.
    pause
    exit /b 1
)
echo   ✓ 数据库已重置
echo.

echo [4/5] 生成 Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo.
    echo   ✗ Prisma Client 生成失败！
    echo.
    pause
    exit /b 1
)
echo   ✓ Prisma Client 已生成
echo.

echo [5/5] 启动开发服务器...
echo.
echo ════════════════════════════════════════════════════════════
echo  修复完成！启动开发服务器...
echo ════════════════════════════════════════════════════════════
echo.
echo  访问地址: http://localhost:3000
echo  按 Ctrl+C 停止服务器
echo.

npm run dev
