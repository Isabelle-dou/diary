@echo off
chcp 65001 >nul
echo ========================================
echo Next.js ChunkLoadError 修复工具
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 停止开发服务器...
echo   请确保开发服务器已停止（按 Ctrl+C 停止）
pause
echo.

echo [2/5] 清理构建缓存...
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
echo.

echo [3/5] 重新安装依赖...
call npm install
if errorlevel 1 (
    echo   ✗ 依赖安装失败
) else (
    echo   ✓ 依赖安装成功
)
echo.

echo [4/5] 重新构建项目...
call npm run build
if errorlevel 1 (
    echo   ✗ 构建失败！请检查错误信息
    pause
    exit /b 1
) else (
    echo   ✓ 构建成功
)
echo.

echo [5/5] 启动开发服务器...
echo.
echo ========================================
echo 修复完成！启动开发服务器...
echo ========================================
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

call npm run dev
