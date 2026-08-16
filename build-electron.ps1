# Electron Build Script
# This script automatically packages the application and copies necessary node_modules

Write-Host "Starting Electron build process..." -ForegroundColor Green

# Set cache directory to local project folder to avoid permission issues
$env:ELECTRON_BUILDER_CACHE = "$PSScriptRoot\.cache"
# Use mirror for electron-builder binaries to avoid network issues
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"

if (-not (Test-Path $env:ELECTRON_BUILDER_CACHE)) {
    New-Item -ItemType Directory -Path $env:ELECTRON_BUILDER_CACHE | Out-Null
}

# 0. Force close related processes
Write-Host "`nStep 0: Force closing related processes to release file locks..." -ForegroundColor Yellow
$processes = @("luk", "electron", "app-builder")
foreach ($process in $processes) {
    Stop-Process -Name $process -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

# 1. Clean old build files
Write-Host "`nStep 1: Cleaning old build files..." -ForegroundColor Yellow
Remove-Item -Path "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path "dist-electron") {
    Write-Host "Warning: Could not completely remove dist-electron folder. Some files might still be in use." -ForegroundColor Red
}

# 2. Run electron-builder
Write-Host "`nStep 2: Running electron-builder..." -ForegroundColor Yellow
npx electron-builder --dir

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nError: electron-builder failed to execute" -ForegroundColor Red
    exit 1
}

# 3. Copy node_modules and flatten standalone structure
Write-Host "`nStep 3: Copying node_modules and flattening standalone structure..." -ForegroundColor Yellow

# Find the actual standalone directory (it might be nested due to absolute paths)
$standaloneSearchPath = Get-ChildItem -Path ".next\standalone" -Recurse -Filter "server.js" | Select-Object -First 1
if ($standaloneSearchPath) {
    $actualStandalonePath = $standaloneSearchPath.Directory.FullName
    Write-Host "Found standalone directory at: $actualStandalonePath" -ForegroundColor Cyan

    # Copy all files from the actual standalone directory to the destination
    $destStandalone = "dist-electron\win-unpacked\resources\standalone"
    Copy-Item -Path "$actualStandalonePath\*" -Destination $destStandalone -Recurse -Force
    Write-Host "Standalone files copied and flattened successfully" -ForegroundColor Green
}
else {
    Write-Host "Warning: Could not find server.js in .next\standalone" -ForegroundColor Red
}

# 4. Verify build results
Write-Host "`nStep 4: Verifying build results..." -ForegroundColor Yellow
$exePath = "dist-electron\win-unpacked\luk.exe"
$serverPath = "dist-electron\win-unpacked\resources\standalone\server.js"
$nodeModulesPath = "dist-electron\win-unpacked\resources\standalone\node_modules"

$allGood = $true

if (Test-Path $exePath) {
    Write-Host "OK: Executable exists: $exePath" -ForegroundColor Green
}
else {
    Write-Host "Error: Executable missing: $exePath" -ForegroundColor Red
    $allGood = $false
}

if (Test-Path $serverPath) {
    Write-Host "OK: Server.js exists: $serverPath" -ForegroundColor Green
}
else {
    Write-Host "Error: Server.js missing: $serverPath" -ForegroundColor Red
    $allGood = $false
}

if (Test-Path $nodeModulesPath) {
    Write-Host "OK: node_modules exists: $nodeModulesPath" -ForegroundColor Green
}
else {
    Write-Host "Error: node_modules missing: $nodeModulesPath" -ForegroundColor Red
    $allGood = $false
}

if ($allGood) {
    Write-Host "`nBuild Complete! All files are ready." -ForegroundColor Green
    Write-Host "`nYou can run the application with the following command:" -ForegroundColor Cyan
    Write-Host "  .\dist-electron\win-unpacked\luk.exe" -ForegroundColor White
}
else {
    Write-Host "`nBuild process encountered issues. Please check the errors above." -ForegroundColor Red
    exit 1
}
