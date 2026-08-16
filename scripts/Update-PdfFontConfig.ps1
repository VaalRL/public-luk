# 更新 PDF 字型配置到優化版本
# 此腳本會自動修改 src/lib/pdf-fonts.ts 使用優化後的字型

Write-Host "🔧 更新 PDF 字型配置..." -ForegroundColor Cyan

$fontConfigFile = Join-Path $PSScriptRoot "..\src\lib\pdf-fonts.ts"
$optimizedFont400 = "noto-sans-tc-400-optimized.woff2"
$optimizedFont700 = "noto-sans-tc-700-optimized.woff2"

# 檢查優化字型是否存在
$fontDir = Join-Path $PSScriptRoot "..\public\fonts"
if (-not (Test-Path (Join-Path $fontDir $optimizedFont400))) {
    Write-Host "✗ 錯誤: 找不到優化字型 $optimizedFont400" -ForegroundColor Red
    Write-Host "   請先執行: .\optimize-fonts.ps1" -ForegroundColor Yellow
    exit 1
}

# 讀取配置檔案
$content = Get-Content $fontConfigFile -Raw

# 替換字型路徑
$newContent = $content `
    -replace 'noto-sans-tc-chinese-traditional-400-normal\.woff', $optimizedFont400 `
    -replace 'noto-sans-tc-chinese-traditional-700-normal\.woff', $optimizedFont700 `
    -replace 'noto-sans-tc-400-subset\.woff', $optimizedFont400 `
    -replace 'noto-sans-tc-700-subset\.woff', $optimizedFont700 `
    -replace "console\.log\('PDF fonts registered successfully.*?\);", "console.log('PDF fonts registered successfully (optimized subset with full Chinese support)');"

# 寫回檔案
Set-Content $fontConfigFile -Value $newContent -NoNewline

Write-Host "✅ 字型配置已更新!" -ForegroundColor Green
Write-Host "`n使用字型:" -ForegroundColor Cyan
Write-Host "  - $optimizedFont400" -ForegroundColor Gray
Write-Host "  - $optimizedFont700" -ForegroundColor Gray
Write-Host "`n💡 預期效果:" -ForegroundColor Yellow
Write-Host "  ✓ 支援所有中文字符和全形標點" -ForegroundColor Green
Write-Host "  ✓ 字型大小縮減 85-90%" -ForegroundColor Green
Write-Host "  ✓ PDF 生成速度提升 3-5 倍" -ForegroundColor Green
Write-Host "`n請重新啟動開發伺服器以套用變更。" -ForegroundColor Yellow
