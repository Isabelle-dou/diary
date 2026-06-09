@echo off
echo ========================================
echo 修复 Prisma 数据库问题
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 删除旧的 Prisma 迁移状态...
if exist prisma\migrations rmdir /s /q prisma\migrations
echo.

echo [2/4] 执行 Prisma 数据库推送...
call npx prisma db push --force-reset
echo.

echo [3/4] 生成 Prisma Client...
call npx prisma generate
echo.

echo [4/4] 完成！
echo.
echo 请重新启动开发服务器: npx next dev
echo.

pause
