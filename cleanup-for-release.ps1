# 發布前清理腳本
# 用途: 自動清理測試檔案、臨時檔案和開發用檔案

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  發布前 Repository 清理工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 詢問確認
$confirmation = Read-Host "此操作將刪除測試檔案和臨時檔案。是否繼續? (Y/N)"
if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
    Write-Host "已取消清理。" -ForegroundColor Yellow
    exit
}

Write-Host "`n開始清理 repository..." -ForegroundColor Green

# 計數器
$deletedCount = 0

# 1. 刪除測試腳本
Write-Host "`n[1/8] 清理測試腳本..." -ForegroundColor Yellow
$testScripts = @(
    "apply-migration.js",
    "check-accounts.js",
    "check-accounts.ts",
    "check-company-12345.js",
    "check-reconciliation.js",
    "check-tx-status.js",
    "inspect_excel.js",
    "inspect_excel_v2.js",
    "simulate-automatch.js",
    "test-automatch.js"
)

foreach ($file in $testScripts) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ✓ 已刪除: $file" -ForegroundColor Gray
        $deletedCount++
    }
}

# 2. 刪除測試輸出
Write-Host "`n[2/8] 清理測試輸出..." -ForegroundColor Yellow
$outputFiles = @(
    "check-output.txt",
    "simulate-output.txt",
    "test-output.txt"
)

foreach ($file in $outputFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ✓ 已刪除: $file" -ForegroundColor Gray
        $deletedCount++
    }
}

# 3. 刪除測試資料
Write-Host "`n[3/8] 清理測試資料..." -ForegroundColor Yellow
$testData = @(
    "0000109506251445.csv",
    "Invoice_123123123.pdf",
    "Invoice_33333.pdf",
    "報價單_請款單模板.xlsx",
    "luk-high-resolution-logo-transparent.png",
    "luk-high-resolution-logo.png"
)

foreach ($file in $testData) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ✓ 已刪除: $file" -ForegroundColor Gray
        $deletedCount++
    }
}

# 4. 刪除資料庫
Write-Host "`n[4/8] 清理開發資料庫..." -ForegroundColor Yellow
if (Test-Path "prisma/dev.db") {
    Remove-Item "prisma/dev.db" -Force
    Write-Host "  ✓ 已刪除: prisma/dev.db" -ForegroundColor Gray
    $deletedCount++
}
if (Test-Path "prisma/dev.db-journal") {
    Remove-Item "prisma/dev.db-journal" -Force
    Write-Host "  ✓ 已刪除: prisma/dev.db-journal" -ForegroundColor Gray
    $deletedCount++
}

# 5. 刪除建置產物
Write-Host "`n[5/8] 清理建置產物..." -ForegroundColor Yellow
if (Test-Path "tsconfig.tsbuildinfo") {
    Remove-Item "tsconfig.tsbuildinfo" -Force
    Write-Host "  ✓ 已刪除: tsconfig.tsbuildinfo" -ForegroundColor Gray
    $deletedCount++
}
if (Test-Path ".next") {
    Remove-Item ".next" -Recurse -Force
    Write-Host "  ✓ 已刪除: .next/" -ForegroundColor Gray
    $deletedCount++
}

# 6. 刪除 AI 助手目錄
Write-Host "`n[6/8] 清理 AI 助手目錄..." -ForegroundColor Yellow
$aiDirs = @(".agent", ".claude", ".gemini", "claude")
foreach ($dir in $aiDirs) {
    if (Test-Path $dir) {
        Remove-Item $dir -Recurse -Force
        Write-Host "  ✓ 已刪除: $dir/" -ForegroundColor Gray
        $deletedCount++
    }
}

$aiFiles = @("CLAUDE.md", "gemini.md")
foreach ($file in $aiFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ✓ 已刪除: $file" -ForegroundColor Gray
        $deletedCount++
    }
}

# 7. 刪除臨時文件
Write-Host "`n[7/8] 清理臨時文件..." -ForegroundColor Yellow
$tempFiles = @(
    "update-terminology.ps1",
    "初始需求.md",
    "實作總結-自動對帳.md"
)

foreach ($file in $tempFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ✓ 已刪除: $file" -ForegroundColor Gray
        $deletedCount++
    }
}

# 8. 清理 node_modules 中的快取
Write-Host "`n[8/8] 清理快取..." -ForegroundColor Yellow
if (Test-Path ".next/cache") {
    Remove-Item ".next/cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ 已清除 Next.js 快取" -ForegroundColor Gray
}

# 完成
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  清理完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n統計資訊:" -ForegroundColor Cyan
Write-Host "  已刪除檔案/目錄: $deletedCount 個" -ForegroundColor White

# 後續步驟提示
Write-Host "`n接下來請執行以下步驟：" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. 檢查 Git 狀態" -ForegroundColor White
Write-Host "     git status" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. 更新 README.md" -ForegroundColor White
Write-Host "     (確保包含安裝和使用說明)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. 檢查 .env 檔案" -ForegroundColor White
Write-Host "     (確保沒有敏感資訊)" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. 執行測試" -ForegroundColor White
Write-Host "     npm test" -ForegroundColor Gray
Write-Host ""
Write-Host "  5. 執行建置" -ForegroundColor White
Write-Host "     npm run build" -ForegroundColor Gray
Write-Host ""
Write-Host "  6. 提交變更" -ForegroundColor White
Write-Host "     git add ." -ForegroundColor Gray
Write-Host "     git commit -m 'chore: clean up repository for release'" -ForegroundColor Gray
Write-Host ""

# 詢問是否查看 Git 狀態
$showGit = Read-Host "`n是否查看 Git 狀態? (Y/N)"
if ($showGit -eq 'Y' -or $showGit -eq 'y') {
    Write-Host "`n執行 git status..." -ForegroundColor Yellow
    git status
}

Write-Host "`n清理腳本執行完畢。" -ForegroundColor Green
