# Electron 打包問題修復記錄

## 日期
2025-12-03

## 問題概述

在嘗試將 Next.js 應用程式打包為 Electron 桌面應用程式時，遇到了以下問題：

1. **打包失敗**：`electron-builder` 在下載和解壓縮 `winCodeSign` 工具時持續失敗
2. **圖示未正確顯示**：打包後的應用程式沒有使用指定的自訂圖示
3. **視窗標題錯誤**：啟動時視窗標題顯示舊名稱 "Spreadsheet Comparator" 而非 "luk"
4. **資料庫連接錯誤**：應用程式載入時出現 500 錯誤（Server Components render error）

---

## 問題 1：electron-builder 打包失敗

### 錯誤訊息
```
ERROR: Cannot crworkingDir=C:\Users\USER\AppData\Local\electron-builder\Cache\winCodeSign
Above command failed, retrying 3 more times...
Error: electron-builder failed to execute
```

### 根本原因
1. `electron-builder` 嘗試從 GitHub 下載 `winCodeSign-2.6.0.7z` 工具
2. 下載或解壓縮過程中遇到問題（可能是網路問題、權限問題或路徑過長）
3. 預設快取目錄 `%LOCALAPPDATA%\electron-builder\Cache` 可能存在權限或檔案鎖定問題

### 解決方案

#### 方案 1：修改快取目錄和使用鏡像站點（已實施）

在 `build-electron.ps1` 中添加環境變數設定：

```powershell
# Set cache directory to local project folder to avoid permission issues
$env:ELECTRON_BUILDER_CACHE = "$PSScriptRoot\.cache"
# Use mirror for electron-builder binaries to avoid network issues
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
```

**優點**：
- 將快取移到專案目錄，避免系統目錄權限問題
- 使用鏡像站點提高下載穩定性（特別適合亞洲地區）

#### 方案 2：修改 package.json 配置（最終解決方案）

將 `build.win.target` 從 `nsis` 改為 `dir`，並明確禁用簽名：

```json
{
  "build": {
    "win": {
      "target": "dir",
      "icon": "public/luk-logo.ico",
      "signAndEditExecutable": false
    }
  }
}
```

**優點**：
- 只生成可執行目錄（`win-unpacked`），不生成安裝程式
- 避免需要 NSIS 和 winCodeSign 工具
- 打包速度更快
- 對於開發和測試階段更方便

**缺點**：
- 不會生成 `.exe` 安裝程式
- 如果需要分發給最終用戶，需要手動壓縮 `win-unpacked` 資料夾

#### 方案 3：手動下載工具（備用方案）

創建了 `setup-build-tools.ps1` 腳本來手動下載和解壓縮所需工具：

```powershell
# 下載 winCodeSign
$url = "https://npmmirror.com/mirrors/electron-builder-binaries/winCodeSign-2.6.0/winCodeSign-2.6.0.7z"
Invoke-WebRequest -Uri $url -OutFile "$cacheDir\winCodeSign-2.6.0.7z"

# 使用 7zip 解壓縮
& "$PWD\node_modules\7zip-bin\win\x64\7za.exe" x $output -o"$cacheDir" -y
```

---

## 問題 2 & 3：圖示和視窗標題

### 根本原因
1. `package.json` 中的 `productName` 仍為舊名稱
2. `package.json` 中的 `icon` 路徑指向 `.png` 而非 `.ico`
3. `electron/main.js` 中的視窗配置使用硬編碼的舊名稱和圖示路徑

### 解決方案

#### 1. 轉換圖示格式

創建了 `convert-icon.js` 腳本將 PNG 轉換為 ICO：

```javascript
const pngBuffer = fs.readFileSync('public/luk-logo.png');
// 創建 ICO 檔案結構（包含 header, directory entry, PNG data）
const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
fs.writeFileSync('public/luk-logo.ico', icoBuffer);
```

#### 2. 更新 package.json

```json
{
  "build": {
    "productName": "luk",
    "win": {
      "icon": "public/luk-logo.ico"
    }
  }
}
```

#### 3. 更新 electron/main.js

```javascript
function createWindow() {
    mainWindow = new BrowserWindow({
        title: 'luk',
        icon: path.join(__dirname, '../public/luk-logo.ico')
    });
}
```

#### 4. 更新 build-electron.ps1

將所有參照 "Spreadsheet Comparator" 的地方改為 "luk"：

```powershell
$processes = @("luk", "electron", "app-builder")
$exePath = "dist-electron\win-unpacked\luk.exe"
Write-Host "  .\dist-electron\win-unpacked\luk.exe"
```

---

## 問題 4：資料庫連接錯誤（500 錯誤）

### 錯誤訊息
```
Application error: a server-side exception has occurred while loading localhost
Digest: 370889641
```

### 根本原因
1. Prisma Client 在 Windows 環境下，`DATABASE_URL` 中的反斜線 `\` 導致路徑解析錯誤
2. `src/lib/prisma.ts` 沒有明確傳遞 `datasources` 配置給 Prisma Client
3. `src/app/page.tsx` 使用 `export const dynamic = "force-dynamic"` 可能導致過度重新渲染

### 解決方案

#### 1. 修正 electron/main.js 中的資料庫路徑

將 Windows 路徑中的反斜線轉換為正斜線：

```javascript
const dbPath = path.join(userDataPath, 'spreadsheet-comparator.db');
const databaseUrl = `file:${dbPath.replace(/\\/g, '/')}`;

serverProcess = fork(serverPath, [], {
    env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        PORT: PORT.toString(),
        HOSTNAME: 'localhost',
        NODE_ENV: 'production'
    }
});
```

**關鍵點**：`.replace(/\\/g, '/')` 將 `C:\Users\...` 轉換為 `C:/Users/...`

#### 2. 更新 src/lib/prisma.ts

明確傳遞 `datasources` 配置：

```typescript
const prismaConfig: any = {
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
};

// 如果有 DATABASE_URL，明確傳遞給 Prisma
if (process.env.DATABASE_URL) {
    prismaConfig.datasources = {
        db: {
            url: process.env.DATABASE_URL
        }
    };
}

prismaInstance = globalForPrisma.prisma ?? new PrismaClient(prismaConfig);
```

**原因**：確保 Prisma Client 使用 runtime 時的環境變數，而非生成時的預設值。

#### 3. 修改 src/app/page.tsx

將 `force-dynamic` 改為 `revalidate: 0`：

```typescript
// 從這個
export const dynamic = "force-dynamic";

// 改為這個
export const revalidate = 0;
```

**原因**：`revalidate: 0` 確保數據即時性，但不會像 `force-dynamic` 那樣強制每次都重新渲染整個頁面。

#### 4. 恢復 revalidatePath

在 `src/app/actions/invoice.ts` 中重新添加 `revalidatePath`：

```typescript
export async function toggleReminderStatus(id: string, completed: boolean) {
    await prisma.invoiceReminder.update({
        where: { id },
        data: { completed },
    });
    revalidatePath("/", "page");
}
```

**原因**：在生產環境中需要明確通知 Next.js 數據已更改。

---

## 除錯工具

### 1. 錯誤日誌記錄

在 `src/lib/prisma.ts` 中添加日誌功能：

```typescript
const logError = (msg: string) => {
    try {
        const appData = process.env.APPDATA || process.env.HOME || process.cwd();
        const logDir = path.join(appData, 'spreadsheet-comparator');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logPath = path.join(logDir, 'prisma-error.log');
        fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) {
        // 忽略日誌寫入錯誤
    }
};
```

**日誌位置**：`%APPDATA%\spreadsheet-comparator\prisma-error.log`

### 2. 資料庫連接測試腳本

創建了 `debug-db-connection.js` 來測試 Prisma 連接：

```javascript
const dbPath = path.join(process.env.APPDATA || process.cwd(), 'spreadsheet-comparator', 'spreadsheet-comparator.db');
const databaseUrl = `file:${dbPath.replace(/\\/g, '/')}`;

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl
        }
    }
});

const count = await prisma.company.count();
console.log('✓ Connection successful! Company count:', count);
```

---

## 最終打包流程

### 1. 執行打包命令

```powershell
npm run electron:package
```

這會執行：
1. `npm run build` - 建置 Next.js 應用程式
2. `powershell -ExecutionPolicy Bypass -File ./build-electron.ps1` - 執行 Electron 打包腳本

### 2. build-electron.ps1 流程

```powershell
# Step 0: 設置環境變數
$env:ELECTRON_BUILDER_CACHE = "$PSScriptRoot\.cache"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"

# Step 1: 強制關閉相關進程
Stop-Process -Name "luk", "electron", "app-builder" -Force -ErrorAction SilentlyContinue

# Step 2: 清理舊建置檔案
Remove-Item -Path "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue

# Step 3: 執行 electron-builder
npx electron-builder --dir

# Step 4: 複製 node_modules
Copy-Item -Path ".next\standalone\node_modules" -Destination "dist-electron\win-unpacked\resources\standalone" -Recurse -Force

# Step 5: 驗證建置結果
Test-Path "dist-electron\win-unpacked\luk.exe"
Test-Path "dist-electron\win-unpacked\resources\standalone\server.js"
Test-Path "dist-electron\win-unpacked\resources\standalone\node_modules"
```

### 3. 執行應用程式

```powershell
.\dist-electron\win-unpacked\luk.exe
```

---

## 關鍵檔案清單

### 修改的檔案
1. `package.json` - 更新 productName, icon, target, signAndEditExecutable
2. `electron/main.js` - 修正 DATABASE_URL 路徑格式，更新視窗標題和圖示
3. `src/lib/prisma.ts` - 明確傳遞 datasources 配置，添加錯誤日誌
4. `src/app/page.tsx` - 將 force-dynamic 改為 revalidate: 0
5. `src/app/actions/invoice.ts` - 重新添加 revalidatePath
6. `build-electron.ps1` - 添加環境變數設定，更新所有參照名稱

### 新增的檔案
1. `convert-icon.js` - PNG 轉 ICO 工具
2. `setup-build-tools.ps1` - 手動下載建置工具（備用）
3. `debug-db-connection.js` - 資料庫連接測試工具
4. `public/luk-logo.ico` - 轉換後的圖示檔案

### 生成的檔案/資料夾
1. `.cache/` - electron-builder 本地快取目錄
2. `dist-electron/win-unpacked/` - 打包後的應用程式目錄
3. `%APPDATA%\spreadsheet-comparator\prisma-error.log` - Prisma 錯誤日誌

---

## 未來改進建議

### 1. 生成安裝程式
如果需要分發給最終用戶，可以將 `target` 改回 `nsis`：

```json
{
  "build": {
    "win": {
      "target": "nsis"
    }
  }
}
```

但需要確保 `winCodeSign` 工具能正常下載，或使用 `setup-build-tools.ps1` 手動準備。

### 2. 程式碼簽名
為了避免 Windows SmartScreen 警告，可以考慮購買程式碼簽名憑證：

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "password"
    }
  }
}
```

### 3. 自動更新
可以整合 `electron-updater` 來實現自動更新功能：

```javascript
const { autoUpdater } = require('electron-updater');
autoUpdater.checkForUpdatesAndNotify();
```

### 4. 優化圖示
目前的 ICO 轉換腳本只包含單一尺寸。建議使用專業工具生成包含多種尺寸的 ICO 檔案：
- 16x16
- 32x32
- 48x48
- 256x256

---

## 常見問題排除

### Q1: 打包後應用程式無法啟動
**檢查項目**：
1. 確認 `dist-electron/win-unpacked/resources/standalone/server.js` 存在
2. 確認 `dist-electron/win-unpacked/resources/standalone/node_modules` 存在
3. 檢查 `%APPDATA%\spreadsheet-comparator\prisma-error.log` 是否有錯誤

### Q2: 資料庫連接失敗
**檢查項目**：
1. 確認 `%APPDATA%\spreadsheet-comparator\spreadsheet-comparator.db` 存在
2. 執行 `debug-db-connection.js` 測試連接
3. 檢查 `DATABASE_URL` 格式是否正確（使用正斜線）

### Q3: electron-builder 下載失敗
**解決方案**：
1. 清除快取：`Remove-Item "$env:LOCALAPPDATA\electron-builder\Cache" -Recurse -Force`
2. 使用鏡像站點（已在 `build-electron.ps1` 中設定）
3. 執行 `setup-build-tools.ps1` 手動下載工具

### Q4: 圖示未顯示
**檢查項目**：
1. 確認 `public/luk-logo.ico` 存在
2. 確認 `package.json` 中 `icon` 路徑正確
3. 確認 `electron/main.js` 中 `icon` 路徑正確
4. 重新打包（Windows 可能會快取舊圖示）

---

## 總結

這次打包問題的核心在於：
1. **環境問題**：`electron-builder` 的下載和快取機制在某些環境下不穩定
2. **配置問題**：需要明確設定各種路徑和選項，避免依賴預設行為
3. **平台差異**：Windows 路徑格式需要特別處理

通過將 `target` 改為 `dir`、使用本地快取、修正路徑格式，以及明確配置 Prisma，成功解決了所有問題。

**關鍵教訓**：
- 在開發階段，使用 `target: "dir"` 可以大幅簡化打包流程
- 路徑處理要特別注意跨平台兼容性（特別是 Windows 的反斜線）
- 環境變數的傳遞和使用要明確，不要依賴隱式行為
- 充分的日誌記錄對於診斷生產環境問題至關重要

---

## 問題 5：PDF 備份檔案無法存取

### 問題描述
使用者反映在 Electron 版本中，立帳管理產出的 PDF 檔案沒有在本地備份目錄中看到。

### 根本原因
1. `src/app/actions/pdf-backup.ts` 使用 `process.cwd()` 來決定備份路徑。
2. 在 Electron 打包環境中，`process.cwd()` 指向 `resources/standalone` 目錄（應用程式內部資源目錄）。
3. 該目錄通常是唯讀的，或者位於使用者不易存取的深層路徑中。
4. 應用程式更新時，該目錄會被覆蓋，導致備份遺失。

### 解決方案

#### 1. 修改 electron/main.js
在啟動 Next.js server 時，通過環境變數傳遞正確的 `userData` 路徑：

```javascript
env: {
    ...process.env,
    // ...
    PDF_BACKUP_DIR: path.join(userDataPath, 'backups', 'pdfs')
}
```

#### 2. 修改 src/app/actions/pdf-backup.ts
優先使用環境變數 `PDF_BACKUP_DIR`：

```typescript
const backupRoot = process.env.PDF_BACKUP_DIR || path.join(process.cwd(), PDF_BACKUP_CONFIG.backupRoot);
```

### 結果
PDF 備份現在會儲存在使用者的應用程式資料目錄中：
- Windows: `%APPDATA%\luk\backups\pdfs\`
- macOS: `~/Library/Application Support/luk/backups/pdfs/`
- Linux: `~/.config/luk/backups/pdfs/`

