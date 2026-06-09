@echo off
chcp 65001 >nul
echo ========================================
echo 头像上传功能修复工具 v1.0
echo ========================================
echo.

cd /d "%~dp0"

echo [1/7] 检查 Node.js 环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ✗ 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)
echo   ✓ Node.js 已安装
echo.

echo [2/7] 停止开发服务器...
echo   请确保开发服务器已停止（按 Ctrl+C 停止）
pause
echo.

echo [3/7] 清理构建缓存...
if exist ".next" (
    rd /s /q ".next"
    echo   ✓ .next 目录已清理
) else (
    echo   - .next 目录不存在，跳过
)

if exist "node_modules\.cache" (
    rd /s /q "node_modules\.cache"
    echo   ✓ node_modules\.cache 已清理
) else (
    echo   - node_modules\.cache 不存在，跳过
)

if exist "node_modules\.prisma" (
    rd /s /q "node_modules\.prisma"
    echo   ✓ Prisma Client 缓存已清理
) else (
    echo   - Prisma Client 缓存不存在，跳过
)
echo.

echo [4/7] 重新安装依赖...
call npm install
if errorlevel 1 (
    echo   ✗ 依赖安装失败，请检查网络连接
    pause
    exit /b 1
)
echo   ✓ 依赖安装成功
echo.

echo [5/7] 重置并推送数据库变更...
call npx prisma db push --force-reset
if errorlevel 1 (
    echo   ✗ 数据库推送失败！
    echo   请手动检查数据库配置
    pause
    exit /b 1
)
echo   ✓ 数据库已更新
echo.

echo [6/7] 生成 Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo   ✗ Prisma Client 生成失败！
    echo   请手动运行: npx prisma generate
    pause
    exit /b 1
)
echo   ✓ Prisma Client 已生成
echo.

echo [7/7] 启动开发服务器...
echo.
echo ========================================
echo 修复完成！启动开发服务器...
echo ========================================
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

call npm run dev
