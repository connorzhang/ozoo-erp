# C盘全面清理脚本
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "     C盘全面清理工具" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# 1. 分析用户文件夹下的大目录
Write-Host "1. 检查用户文件夹下的大目录..." -ForegroundColor Yellow
$userDir = $env:USERPROFILE
$dirs = Get-ChildItem -Path $userDir -Directory -ErrorAction SilentlyContinue
$bigDirs = @()
foreach ($dir in $dirs) {
    try {
        $size = (Get-ChildItem -Path $dir.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $sizeGB = [math]::Round($size/1GB, 2)
        if ($sizeGB -gt 0.5) {
            $bigDirs += [PSCustomObject]@{
                Name = $dir.Name
                SizeGB = $sizeGB
                Path = $dir.FullName
            }
        }
    } catch {}
}
$bigDirs | Sort-Object SizeGB -Descending | Format-Table -AutoSize

# 2. 检查下载文件夹
Write-Host ""
Write-Host "2. 检查下载文件夹..." -ForegroundColor Yellow
$downloadDir = Join-Path $userDir "Downloads"
if (Test-Path $downloadDir) {
    $downloadSize = (Get-ChildItem -Path $downloadDir -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $downloadSizeGB = [math]::Round($downloadSize/1GB, 2)
    Write-Host "   下载文件夹大小: ${downloadSizeGB} GB" -ForegroundColor Cyan
    Write-Host "   路径: $downloadDir" -ForegroundColor Gray
    Write-Host "   建议: 手动清理不需要的文件" -ForegroundColor Yellow
}

# 3. 检查浏览器缓存
Write-Host ""
Write-Host "3. 浏览器缓存位置提示:" -ForegroundColor Yellow
Write-Host "   Chrome: $userDir\AppData\Local\Google\Chrome\User Data\Default\Cache" -ForegroundColor Gray
Write-Host "   Edge: $userDir\AppData\Local\Microsoft\Edge\User Data\Default\Cache" -ForegroundColor Gray

# 4. 检查 Windows.old 文件夹
Write-Host ""
Write-Host "4. 检查 Windows.old 文件夹..." -ForegroundColor Yellow
if (Test-Path "C:\Windows.old") {
    $oldSize = (Get-ChildItem -Path "C:\Windows.old" -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $oldSizeGB = [math]::Round($oldSize/1GB, 2)
    Write-Host "   发现 Windows.old: ${oldSizeGB} GB" -ForegroundColor Yellow
    Write-Host "   建议: 使用磁盘清理工具删除此文件夹" -ForegroundColor Cyan
} else {
    Write-Host "   Windows.old 不存在" -ForegroundColor Green
}

# 5. 给出清理建议
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   清理建议" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "已启动磁盘清理工具，请勾选以下选项:" -ForegroundColor Yellow
Write-Host "  √ 临时文件" -ForegroundColor Gray
Write-Host "  √ Windows 更新清理" -ForegroundColor Gray
Write-Host "  √ 回收站" -ForegroundColor Gray
Write-Host "  √ 系统错误内存转储文件" -ForegroundColor Gray
Write-Host "  √ 设备驱动程序包" -ForegroundColor Gray
Write-Host ""
Write-Host "完成后运行 move-temp-folders.ps1 迁移临时文件夹" -ForegroundColor Cyan
