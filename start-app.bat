@echo off
setlocal enabledelayedexpansion

TITLE Spreadsheet Comparator - 啟動中...
COLOR 0A

echo ===================================================
echo   Spreadsheet Comparator - 智慧對帳系統
echo ===================================================
echo.

:: 1. 檢查 Node.js 是否安裝
node --version >nul 2>&1
if %errorlevel% neq 0 (
    COLOR 0C
    echo [錯誤] 未檢測到 Node.js！
    echo.
    echo 請前往 https://nodejs.org/ 下載並安裝 Node.js (LTS 版本)。
    echo 安裝完成後，請重新執行此檔案。
    echo.
    pause
    exit /b
)

:: 2. 檢查專案依賴
if not exist "node_modules" (
    echo [系統] 首次執行，正在安裝依賴... (這可能需要幾分鐘)
    call npm install
    if %errorlevel% neq 0 (
        COLOR 0C
        echo [錯誤] 依賴安裝失敗。
        pause
        exit /b
    )
    
    echo [系統] 初始化資料庫...
    call npx prisma migrate deploy
    if %errorlevel% neq 0 (
        COLOR 0C
        echo [錯誤] 資料庫初始化失敗。
        pause
        exit /b
    )
    
    echo [系統] 建置應用程式...
    call npm run build
    if %errorlevel% neq 0 (
        COLOR 0C
        echo [錯誤] 應用程式建置失敗。
        pause
        exit /b
    )
)

:: 3. 檢查資料庫是否存在 (再次確認)
if not exist "prisma\dev.db" (
    echo [系統] 資料庫檔案遺失，正在重新建立...
    call npx prisma migrate deploy
)

:: 4. 啟動應用程式
echo.
echo [系統] 正在啟動伺服器...
echo [提示] 伺服器啟動後，將自動開啟瀏覽器。
echo [提示] 請勿關閉此視窗，否則服務將停止。
echo.

:: 在背景啟動瀏覽器 (延遲 5 秒)
start "" /b cmd /c "timeout /t 5 >nul & start http://localhost:3001"

:: 啟動 Next.js
call npm start

pause
