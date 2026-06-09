# 修复 Prisma 数据库问题脚本
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "修复 Prisma 数据库问题" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 切换到脚本目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "[1/5] 清理 Next.js 构建缓存..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "  ✓ 已删除 .next 目录" -ForegroundColor Green
} else {
    Write-Host "  - .next 目录不存在，跳过" -ForegroundColor Gray
}
Write-Host ""

Write-Host "[2/5] 清理 Prisma Client 缓存..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma"
    Write-Host "  ✓ 已删除 Prisma Client 缓存" -ForegroundColor Green
} else {
    Write-Host "  - Prisma Client 缓存不存在，跳过" -ForegroundColor Gray
}
Write-Host ""

Write-Host "[3/5] 重置并推送数据库..." -ForegroundColor Yellow
npx prisma db push --force-reset
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ 数据库推送失败" -ForegroundColor Red
    Write-Host "  请手动运行: npx prisma db push --force-reset" -ForegroundColor Red
} else {
    Write-Host "  ✓ 数据库推送成功" -ForegroundColor Green
}
Write-Host ""

Write-Host "[4/5] 重新生成 Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Prisma Client 生成失败" -ForegroundColor Red
    Write-Host "  请手动运行: npx prisma generate" -ForegroundColor Red
} else {
    Write-Host "  ✓ Prisma Client 生成成功" -ForegroundColor Green
}
Write-Host ""

Write-Host "[5/5] 清理完成！" -ForegroundColor Green
Write-Host ""
Write-Host "请重新启动开发服务器: npx next dev" -ForegroundColor Cyan
Write-Host ""
