# Spreadsheet Comparator - Electron 打包指南

## ✅ 成功解決的問題

我們已經成功解決了 Electron 應用程式打包後的空白畫面問題。主要問題是：

1. **缺少 node_modules**: Next.js standalone 模式需要 `node_modules`，但 `electron-builder` 的 `extraResources` 無法正確複製大型目錄
2. **路徑配置**: 需要正確配置 `process.resourcesPath` 來找到 `server.js`

## 🚀 快速開始

### 開發模式

```bash
npm run electron:dev
```

這會同時啟動 Next.js 開發伺服器和 Electron 視窗。

### 打包應用程式

使用我們的自動化打包腳本（推薦）：

```bash
npm run electron:package
```

這個命令會：
1. 執行 `npm run build` 來建立 Next.js standalone 版本
2. 執行 `electron-builder --dir` 來打包 Electron 應用
3. 自動複製 `node_modules` 到正確的位置
4. 驗證所有必要的檔案是否存在

### 手動打包（不推薦）

如果您想手動打包：

```bash
# 1. 建立 Next.js
npm run build

# 2. 打包 Electron
npx electron-builder --dir

# 3. 手動複製 node_modules
Copy-Item -Path ".next\standalone\node_modules" -Destination "dist-electron\win-unpacked\resources\standalone" -Recurse -Force
```

## 📁 打包後的檔案結構

```
dist-electron/
└── win-unpacked/
    ├── Spreadsheet Comparator.exe  # 主執行檔
    └── resources/
        ├── app.asar                 # Electron 應用程式碼
        ├── standalone/              # Next.js standalone 伺服器
        │   ├── server.js           # Next.js 伺服器入口
        │   ├── node_modules/       # 必要的依賴（手動複製）
        │   ├── .next/              # Next.js 建構輸出
        │   └── public/             # 靜態資源
        └── prisma/
            └── dev.db              # 資料庫模板
```

## 🔧 技術細節

### 為什麼需要手動複製 node_modules？

Next.js 的 standalone 模式會生成一個最小化的 `node_modules` 目錄，只包含運行時需要的依賴。但是 `electron-builder` 的 `extraResources` 在處理大型目錄時會遇到問題，導致複製失敗或不完整。

我們的解決方案是：
1. 使用 `extraResources` 複製除了 `node_modules` 之外的所有檔案
2. 在打包完成後，使用 PowerShell 腳本手動複製 `node_modules`

### 關鍵配置檔案

#### `package.json` - electron-builder 配置

```json
{
  "build": {
    "extraResources": [
      {
        "from": ".next/standalone",
        "to": "standalone"
      },
      // ... 其他資源
    ]
  }
}
```

#### `electron/main.js` - 路徑配置

```javascript
// 在打包後，standalone 會在 resources/standalone 中
const possiblePaths = [];

if (app.isPackaged) {
    possiblePaths.push(path.join(process.resourcesPath, 'standalone', 'server.js'));
}
```

#### `build-electron.ps1` - 自動化打包腳本

這個腳本會：
- 清理舊的打包檔案
- 執行 electron-builder
- 複製 node_modules
- 驗證打包結果

## 🐛 常見問題

### 問題：應用程式啟動後顯示空白畫面

**原因**: `node_modules` 沒有被正確複製

**解決方案**: 
```bash
# 手動複製 node_modules
Copy-Item -Path ".next\standalone\node_modules" -Destination "dist-electron\win-unpacked\resources\standalone" -Recurse -Force
```

### 問題：找不到 server.js

**原因**: Next.js build 失敗或路徑配置錯誤

**解決方案**:
1. 確認 `npm run build` 成功完成
2. 檢查 `.next/standalone/server.js` 是否存在
3. 確認 `package.json` 中的 `extraResources` 配置正確

### 問題：資料庫錯誤

**原因**: 資料庫檔案沒有被正確複製

**解決方案**:
確認 `prisma/dev.db` 存在，並且在 `extraResources` 中正確配置

## 📝 下一步

如果您想創建安裝程式（.exe），可以使用：

```bash
npm run electron:build
```

這會創建一個 NSIS 安裝程式，包含：
- 一鍵安裝選項（已禁用）
- 自訂安裝目錄
- 桌面快捷方式
- 開始選單快捷方式

## 🎉 總結

現在您可以成功打包 Spreadsheet Comparator 為獨立的 Electron 應用程式！使用 `npm run electron:package` 命令即可一鍵完成所有步驟。

打包後的應用程式：
- ✅ 不需要用戶安裝 Node.js
- ✅ 包含所有必要的依賴
- ✅ 使用 Electron 內建的 Node.js 環境
- ✅ 可以在沒有網路連接的情況下運行
