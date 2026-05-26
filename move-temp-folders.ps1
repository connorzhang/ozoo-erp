# Windows 临时文件夹迁移脚本
# 目标：将临时文件夹从 C 盘迁移到 K 盘

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "     Windows 临时文件夹迁移工具" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# 设置目标盘
$targetDrive = "K"
$tempRoot = "$targetDrive`:\Temp"

# 1. 创建目标临时文件夹
Write-Host "1/5 创建目标文件夹..." -ForegroundColor Yellow
if (-not (Test-Path $tempRoot)) {
    New-Item -Path $tempRoot -ItemType Directory -Force | Out-Null
    Write-Host "   创建成功: $tempRoot" -ForegroundColor Green
} else {
    Write-Host "   文件夹已存在: $tempRoot" -ForegroundColor Cyan
}

# 为当前用户创建临时子文件夹
$userTempDir = "$tempRoot\$env:USERNAME"
if (-not (Test-Path $userTempDir)) {
    New-Item -Path $userTempDir -ItemType Directory -Force | Out-Null
    Write-Host "   创建用户临时目录: $userTempDir" -ForegroundColor Green
}

# 2. 备份当前环境变量
Write-Host ""
Write-Host "2/5 备份当前临时文件夹设置..." -ForegroundColor Yellow
Write-Host "   当前 TEMP: $env:TEMP" -ForegroundColor Gray
Write-Host "   当前 TMP: $env:TMP" -ForegroundColor Gray

# 3. 修改用户环境变量（当前用户）
Write-Host ""
Write-Host "3/5 修改用户环境变量..." -ForegroundColor Yellow
[Environment]::SetEnvironmentVariable("TEMP", $userTempDir, "User")
[Environment]::SetEnvironmentVariable("TMP", $userTempDir, "User")
Write-Host "   用户 TEMP 设置为: $userTempDir" -ForegroundColor Green
Write-Host "   用户 TMP 设置为: $userTempDir" -ForegroundColor Green

# 4. 复制现有临时文件（可选，保留旧文件）
Write-Host ""
Write-Host "4/5 提示: 旧临时文件不会自动删除，可手动清理..." -ForegroundColor Cyan
Write-Host "   旧 TEMP 文件夹: $env:TEMP" -ForegroundColor Gray
Write-Host "   旧 TMP 文件夹: $env:TMP" -ForegroundColor Gray

# 5. 完成
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   迁移完成！" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "重要提示：" -ForegroundColor Yellow
Write-Host "  1. 请**重启电脑**使环境变量生效" -ForegroundColor Red
Write-Host "  2. 重启后可以手动删除旧的临时文件释放空间" -ForegroundColor Cyan
Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
