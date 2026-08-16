# Electron 自動更新機制說明文件

本文件記錄了本專案中 Electron 應用程式的自動更新原理、流程以及實作方式。我們採用 `electron-updater` 搭配 `electron-builder` 來實現支援 **差異更新 (Differential Updates)** 的現代化更新流程。

## 1. 更新原理

我們使用 **`electron-updater`** 模組。這是一個專為 Electron 應用程式設計的更新管理器，它具有以下特點：

*   **差異更新 (Differential Updates)**：
    系統不會每次都下載完整的安裝檔。它會由 `blockmap` 檔案比對新舊版本的差異，只下載變更部分的數據（通常只有幾 MB），這大幅節省了頻寬並加快了更新速度。
*   **自動化流程**：
    包含檢查版本、下載更新檔、校驗簽章（如果有的話）、以及退出並安裝新版本。
*   **多平台支援**：
    完整支援 Windows (NSIS), macOS, 和 Linux。

### 運作邏輯
1.  **檢查**：App 向發布伺服器（如 GitHub Releases, S3, 或一般 HTTP Server）請求 `latest.yml` 檔案。
2.  **比對**：App 比對本地 `package.json` 的 `version` 與 `latest.yml` 中的版本。
3.  **下載**：
    *   如果有差異 (Differential) 且支援，只下載差異部分。
    *   否則下載完整的安裝檔 (`.exe`)。
4.  **安裝**：下載完成後，觸發 `quitAndInstall`，App 關閉，執行安裝程序，然後重啟。

---

## 2. 實作細節

### A. 依賴套件
專案已安裝以下必要套件：
*   `electron-updater`: 核心更新邏輯。
*   `electron-log`: 用於將更新過程的日誌寫入檔案 (`AppData/Roaming/.../logs/`)，方便除錯。

### B. 主進程 (`electron/main.js`)
在 Main Process 中，我們建立了 IPC 通道來處理更新請求，並透過事件通知渲染進程 (Renderer)。

```javascript
const { autoUpdater } = require('electron-updater');

// 1. 設定日誌
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";

// 2. 關閉自動下載 (可選，讓使用者決定)
autoUpdater.autoDownload = false;

// 3. 設定 IPC 處理器
ipcMain.handle('check-for-updates', async () => { ... });
ipcMain.handle('download-update', async () => { ... });
ipcMain.handle('quit-and-install', () => { ... });

// 4. 轉發狀態給前端
autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-status', 'available', info);
});
// ... 其他事件 (download-progress, update-downloaded 等)
```

### C. 預載腳本 (`electron/preload.js`)
透過 `contextBridge` 將安全的 API 暴露給前端 `window.electron` 物件。

```javascript
contextBridge.exposeInMainWorld('electron', {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    onUpdateStatus: (callback) => {
        // 訂閱與取消訂閱邏輯
    }
});
```

### D. 前端呼叫 (`React Component`)
前端可以主動檢查更新，或監聽被動通知。

```javascript
// 範例：在 useEffect 中監聽
useEffect(() => {
    const unsub = window.electron.onUpdateStatus((status, info) => {
        if (status === 'available') {
            console.log('有新版本:', info.version);
            // 詢問使用者是否下載
        }
        if (status === 'downloaded') {
            // 詢問使用者是否重啟
            window.electron.quitAndInstall();
        }
    });
    return () => unsub();
}, []);

// 主動檢查
const handleCheck = async () => {
    const result = await window.electron.checkForUpdates();
    if (result.updateAvailable) {
        // 顯示更新按鈕
    }
};
```

---

## 3. 發布設定與流程

### A. 設定發布源 (`package.json`)
要讓 App 知道去哪裡抓更新，必須設定 `publish` 欄位。最常見的是使用 **GitHub Releases** (免費且整合度高)。

請在 `package.json` 的 `build` 區塊中加入：

```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "您的GitHub帳號",
    "repo": "您的Repo名稱",
    "private": false,  // 如果是私有 repo，需要設定 token
    "token": "YOUR_GH_TOKEN" // 若為私有庫，通常透過環境變數 GH_TOKEN 注入，不要寫死在檔案裡
  },
  ...
}
```

*其他選項：也可以設定 `provider: "generic"` 並指定 `url`，如果您使用自己的伺服器或 S3。*

### B. 發布流程 (開發者)

1.  **修改版本號**：
    編輯 `package.json`，將 `version` 往上加（例如 `0.1.0` -> `0.1.1`）。

2.  **打包應用程式**：
    執行打包指令，確保生成發布檔案。
    ```bash
    npm run electron:build
    ```
    這會產生：
    *   `AppName Setup 0.1.1.exe` (安裝檔)
    *   `latest.yml` (關鍵的中介資料檔案)
    *   `AppName Setup 0.1.1.exe.blockmap` (差異比對檔)

3.  **上傳發布**：
    *   在 GitHub 建立一個新的 Release，Tag 必須為 `v0.1.1` (與 package.json 對應)。
    *   將上述所有檔案上傳到該 Release 中。
    *   **發布 Release**。

### C. 更新流程 (使用者)

1.  使用者打開舊版 App (v0.1.0)。
2.  App 啟動或使用者點擊「檢查更新」。
3.  App 下載 GitHub 上的 `latest.yml`，發現有 `v0.1.1`。
4.  App 下載 blockmap 並比對，下載差異部分 (通常很快)。
5.  下載完成，跳出提示。
6.  使用者點擊「立即安裝」。
7.  App 關閉，安裝程式在背景快速替換檔案，App 自動重啟變成 v0.1.1。

---

## 4. 注意事項

1.  **開發模式 (Development Mode)**：
    在開發模式下 (`npm run electron:dev`)，`electron-updater` 預設不會執行更新檢查，或者需要特殊的 `dev-app-update.yml` 設定。請以打包後的應用程式進行測試。

2.  **程式碼簽章 (Code Signing)**：
    *   **macOS**: 這是**強制**的。沒有簽章的 App 無法使用自動更新。
    *   **Windows**: 雖然不是強制，但強烈建議。沒有簽章的 EXE 在下載時可能會被 Windows SmartScreen 阻擋，或被防毒軟體誤判。若無簽章，使用者可能需要手動允許執行。

3.  **降級 (Downgrade)**：
    預設不支援自動降級。

4.  **私有儲存庫 (Private Repo)**：
    如果使用 GitHub 私有庫，使用者端需要有權限存取 (通常透過 token)，或是設定 S3/MinIO 等自建存儲方案會更簡單。
