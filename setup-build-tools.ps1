$ErrorActionPreference = "Stop"

$cacheDir = "$PWD\.cache\winCodeSign"
if (-not (Test-Path $cacheDir)) {
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
}

$sevenZip = "$PWD\node_modules\7zip-bin\win\x64\7za.exe"
$url = "https://npmmirror.com/mirrors/electron-builder-binaries/winCodeSign-2.6.0/winCodeSign-2.6.0.7z"
$output = "$cacheDir\winCodeSign-2.6.0.7z"

Write-Host "Downloading winCodeSign from mirror..."
try {
    Invoke-WebRequest -Uri $url -OutFile $output
    Write-Host "Download complete."
}
catch {
    Write-Host "Download failed: $_"
    exit 1
}

if (Test-Path $sevenZip) {
    Write-Host "Extracting using 7za.exe..."
    & $sevenZip x $output -o"$cacheDir" -y
    Write-Host "Extraction complete."
}
else {
    Write-Host "7za.exe not found at $sevenZip"
    exit 1
}

# Also download nsis if needed
$nsisCacheDir = "$PWD\.cache\nsis"
if (-not (Test-Path $nsisCacheDir)) {
    New-Item -ItemType Directory -Path $nsisCacheDir -Force | Out-Null
}
$nsisUrl = "https://npmmirror.com/mirrors/electron-builder-binaries/nsis-3.0.4.1/nsis-3.0.4.1.7z"
$nsisOutput = "$nsisCacheDir\nsis-3.0.4.1.7z"

Write-Host "Downloading nsis from mirror..."
try {
    Invoke-WebRequest -Uri $nsisUrl -OutFile $nsisOutput
    Write-Host "Download complete."
}
catch {
    Write-Host "Download failed: $_"
    # NSIS might not be strictly required if not building installer, but usually is.
}

if (Test-Path $sevenZip) {
    Write-Host "Extracting nsis..."
    & $sevenZip x $nsisOutput -o"$nsisCacheDir" -y
    Write-Host "Extraction complete."
}
