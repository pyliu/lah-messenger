<#
.SYNOPSIS
    lah-messenger Rust + Tauri v2 環境診斷與引導腳本
.DESCRIPTION
    檢查本機是否具備編譯與執行 Tauri v2 應用所需的工具鏈：
    1. Rust 工具鏈 (rustc / cargo / rustup)
    2. Microsoft C++ Build Tools (MSVC)
    3. Microsoft Edge WebView2 Runtime
    4. Node.js & Yarn 套件環境
#>

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 桃園即時通 (lah-messenger) - Rust + Tauri v2 環境診斷" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# 1. 檢查 Rust / Cargo
Write-Host "[1/4] 檢查 Rust 工具鏈 (rustc & cargo)..." -NoNewline
$cargoPath = Get-Command cargo -ErrorAction SilentlyContinue
if (-not $cargoPath) {
    # 檢查是否位於使用者預設路徑 ~/.cargo/bin
    $userCargo = Join-Path $env:USERPROFILE ".cargo\bin\cargo.exe"
    if (Test-Path $userCargo) {
        $cargoPath = $userCargo
        $env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
    }
}

if ($cargoPath) {
    $rustVer = (& rustc --version)
    Write-Host " [OK]" -ForegroundColor Green
    Write-Host "      偵測到: $rustVer" -ForegroundColor Gray
} else {
    Write-Host " [未安裝]" -ForegroundColor Yellow
    Write-Host "      未於 PATH 偵測到 cargo / rustc。" -ForegroundColor Yellow
    Write-Host "      請由官方網站安裝 Rustup：" -ForegroundColor White
    Write-Host "      👉 https://rustup.rs/ 或 https://win.rustup.rs/x86_64" -ForegroundColor Cyan
    $allGood = $false
}

# 2. 檢查 MSVC C++ Build Tools
Write-Host "[2/4] 檢查 Visual Studio C++ Build Tools (MSVC)..." -NoNewline
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasMsvc = $false
if (Test-Path $vswhere) {
    $vsInstall = & $vswhere -latest -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($vsInstall) {
        $hasMsvc = $true
    }
}

if ($hasMsvc) {
    Write-Host " [OK]" -ForegroundColor Green
    Write-Host "      偵測到 Visual Studio C++ 建置環境" -ForegroundColor Gray
} else {
    Write-Host " [建議確認]" -ForegroundColor Yellow
    Write-Host "      Rust 在 Windows 上預設採用 x86_64-pc-windows-msvc 目標，" -ForegroundColor Yellow
    Write-Host "      若尚未安裝 C++ 建置工具，請於安裝 Rustup 時勾選安裝 Visual Studio C++ Build Tools。" -ForegroundColor Gray
}

# 3. 檢查 WebView2 Runtime
Write-Host "[3/4] 檢查 WebView2 Runtime..." -NoNewline
$regKey64 = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-F501-47EC-A924-A0825B3C74E0}"
$regKey32 = "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-F501-47EC-A924-A0825B3C74E0}"
$hasWebView2 = (Test-Path $regKey64) -or (Test-Path $regKey32)
if ($hasWebView2) {
    Write-Host " [OK]" -ForegroundColor Green
    Write-Host "      系統已安裝 Microsoft Edge WebView2 Runtime" -ForegroundColor Gray
} else {
    Write-Host " [OK (Windows 10/11 內建)]" -ForegroundColor Green
}

# 4. 檢查 Node.js 與套件相依性
Write-Host "[4/4] 檢查 Node.js 與套件環境..." -NoNewline
$nodeVer = (& node -v 2>$null)
if ($nodeVer) {
    Write-Host " [OK]" -ForegroundColor Green
    Write-Host "      Node.js 版本: $nodeVer" -ForegroundColor Gray
    
    if (-not (Test-Path ".\node_modules")) {
        Write-Host "      提示: 目前尚未安裝 node_modules，請先於 lah-messenger 目錄執行：" -ForegroundColor Yellow
        Write-Host "      👉 yarn install 或 npm install" -ForegroundColor Cyan
    }
} else {
    Write-Host " [未安裝]" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 啟動與建置指南" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "1. 安裝相依套件："
Write-Host "   npm install   或   yarn install" -ForegroundColor White
Write-Host ""
Write-Host "2. 啟動 Tauri 開發模式（Nuxt 靜態/熱重載 + Rust 後端）："
Write-Host "   npm run tauri:dev" -ForegroundColor White
Write-Host ""
Write-Host "3. 打包發布 Windows 桌面應用（產出 Portable 與 NSIS 安裝檔）："
Write-Host "   npm run tauri:build" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
