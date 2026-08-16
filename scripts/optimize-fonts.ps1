# Optimize PDF Fonts Script
# This script generates optimized font subsets with all required Chinese characters

Write-Host "Starting font optimization..." -ForegroundColor Cyan

# Check Python installation
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python installed: $pythonVersion" -ForegroundColor Green
}
catch {
    Write-Host "Error: Python is required" -ForegroundColor Red
    Write-Host "Please install from https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Check and install fonttools
Write-Host "`nChecking fonttools..." -ForegroundColor Cyan
try {
    python -m pip show fonttools | Out-Null
    Write-Host "fonttools is installed" -ForegroundColor Green
}
catch {
    Write-Host "Installing fonttools and brotli..." -ForegroundColor Yellow
    python -m pip install fonttools brotli --quiet
    Write-Host "fonttools installed successfully" -ForegroundColor Green
}

# Set paths
$projectRoot = $PSScriptRoot | Split-Path -Parent
$fontsDir = Join-Path $projectRoot "public\fonts"
$subsetDir = Join-Path $projectRoot "font-subset-output"
$unicodeFile = Join-Path $subsetDir "unicode-chars.txt"

# Generate character list if not exists
if (-not (Test-Path $unicodeFile)) {
    Write-Host "`nGenerating character list..." -ForegroundColor Cyan
    Set-Location $projectRoot
    node "scripts\generate-font-subset.js"
}

# Check source fonts
$originalFont400 = Join-Path $fontsDir "noto-sans-tc-chinese-traditional-400-normal.woff"
$originalFont700 = Join-Path $fontsDir "noto-sans-tc-chinese-traditional-700-normal.woff"

if (-not (Test-Path $originalFont400)) {
    Write-Host "Error: Source font 400 not found" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $originalFont700)) {
    Write-Host "Error: Source font 700 not found" -ForegroundColor Red
    exit 1
}

# Output files
$outputFont400 = Join-Path $fontsDir "noto-sans-tc-400-optimized.woff2"
$outputFont700 = Join-Path $fontsDir "noto-sans-tc-700-optimized.woff2"

# Generate optimized font 400
Write-Host "`nGenerating optimized font 400..." -ForegroundColor Cyan
$originalSize = [math]::Round((Get-Item $originalFont400).Length / 1MB, 2)
Write-Host "Source size: $originalSize MB" -ForegroundColor Gray

python -m fontTools.subset `
    $originalFont400 `
    --unicodes-file="$unicodeFile" `
    --flavor=woff2 `
    --output-file="$outputFont400" `
    --layout-features="*" `
    --no-hinting

if (Test-Path $outputFont400) {
    $optimizedSize = [math]::Round((Get-Item $outputFont400).Length / 1KB, 2)
    Write-Host "Done! Optimized size: $optimizedSize KB" -ForegroundColor Green
}
else {
    Write-Host "Failed to generate font 400" -ForegroundColor Red
}

# Generate optimized font 700
Write-Host "`nGenerating optimized font 700..." -ForegroundColor Cyan
$originalSize = [math]::Round((Get-Item $originalFont700).Length / 1MB, 2)
Write-Host "Source size: $originalSize MB" -ForegroundColor Gray

python -m fontTools.subset `
    $originalFont700 `
    --unicodes-file="$unicodeFile" `
    --layout-features="*" `
    --flavor=woff2 `
    --output-file="$outputFont700" `
    --no-hinting

if (Test-Path $outputFont700) {
    $optimizedSize = [math]::Round((Get-Item $outputFont700).Length / 1KB, 2)
    Write-Host "Done! Optimized size: $optimizedSize KB" -ForegroundColor Green
}
else {
    Write-Host "Failed to generate font 700" -ForegroundColor Red
}

# Statistics
Write-Host "`nOptimization Results:" -ForegroundColor Cyan
if (Test-Path $outputFont400) {
    $originalSize = (Get-Item $originalFont400).Length
    $optimizedSize = (Get-Item $outputFont400).Length
    $reduction = [math]::Round((1 - $optimizedSize / $originalSize) * 100, 1)
    Write-Host "Font 400: Reduced by $reduction%" -ForegroundColor Green
}
if (Test-Path $outputFont700) {
    $originalSize = (Get-Item $originalFont700).Length
    $optimizedSize = (Get-Item $outputFont700).Length
    $reduction = [math]::Round((1 - $optimizedSize / $originalSize) * 100, 1)
    Write-Host "Font 700: Reduced by $reduction%" -ForegroundColor Green
}

Write-Host "`nFont optimization complete!" -ForegroundColor Green
Write-Host "Next step: Update font configuration" -ForegroundColor Yellow
Write-Host "Run: powershell -File scripts/Update-PdfFontConfig.ps1" -ForegroundColor Gray
