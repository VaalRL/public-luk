# Electron 桌面應用打包說明

## 📦 打包策略

### 使用者需求
- ✅ 使用者**不需要**安裝 Node.js
- ✅ 雙擊執行檔即可使用
- ✅ 完全獨立的桌面應用程式

### 技術方案
我們採用 **Electron + Next.js Standalone** 的方案：

1. **Electron**: 提供桌面應用框架和內建 Node.js 環境
2. **Next.js Standalone**: 包含所有依賴的獨立伺服器
3. **child_process.fork()**: 使用 Electron 的 Node.js 來運行 Next.js server

### 打包內容
```
Spreadsheet Comparator.exe
├── electron/
│   ├── main.js          # Electron 主進程
│   └── preload.js       # 預加載腳本
├── resources/
│   ├── standalone/      # Next.js standalone server (310MB, 1859 files)
│   │   ├── server.js
│   │   ├── node_modules/
│   │   └── ...
│   ├── standalone/public/
│   ├── standalone/.next/static/
│   └── prisma/
│       └── dev.db       # 資料庫模板
└── [Electron binaries]  # ~200MB
```

## 🚀 執行流程

### 啟動過程
1. 使用者雙擊 `Spreadsheet Comparator.exe`
2. Electron 主進程啟動
3. 檢查並初始化資料庫（位於 `%APPDATA%\Spreadsheet Comparator\`）
4. 使用 `fork()` 啟動 Next.js server（使用 Electron 的 Node.js）
5. 等待 server 啟動（監聽 localhost:3001）
6. 開啟 Electron 視窗並載入 `http://localhost:3001`

### 資料儲存
- **資料庫**: `%APPDATA%\Spreadsheet Comparator\spreadsheet-comparator.db`
- **日誌**: Console 輸出（可配置寫入檔案）
- **上傳檔案**: 臨時處理，不持久化

## 📊 打包時間預估

### 階段分析
1. **Next.js Build**: ~2 分鐘
   - TypeScript 編譯
   - 生成 standalone 輸出
   
2. **Electron Builder**: ~5-10 分鐘
   - 複製 Electron binaries (~200MB)
   - 複製 `.next/standalone` (~310MB, 1859 files) ⏰ **最耗時**
   - 複製 public 和 static 檔案
   - 生成安裝檔（如果是 `electron:build`）

### 為什麼這麼慢？
- `extraResources` 需要複製 1859 個小檔案
- Windows 檔案系統對大量小檔案的處理較慢
- 防毒軟體可能會掃描每個檔案

### 優化建議（未來）
1. **壓縮 standalone**: 將 `.next/standalone` 壓縮成 zip，首次啟動時解壓
2. **使用 asar**: 將 node_modules 打包成 asar 檔案（單一檔案）
3. **排除不必要的檔案**: 過濾掉測試檔案、文件等

## 🎯 打包命令

### 開發測試
```bash
npm run electron:dev
```
- 啟動 Next.js dev server
- 啟動 Electron 視窗
- 支援熱重載

### 打包（僅目錄）
```bash
npm run electron:build:dir
```
- 生成 `dist-electron/win-unpacked/`
- 可直接執行 `Spreadsheet Comparator.exe`
- **不生成安裝檔**，適合測試

### 打包（完整）
```bash
npm run electron:build
```
- 生成 `dist-electron/win-unpacked/`
- 生成 `Spreadsheet Comparator Setup 0.1.0.exe` 安裝檔
- 使用 NSIS 打包器

## 📝 打包後測試

### 測試步驟
1. 進入 `dist-electron/win-unpacked/`
2. 雙擊 `Spreadsheet Comparator.exe`
3. 等待視窗開啟（首次啟動約 5-10 秒）
4. 測試核心功能：
   - 新增公司
   - 建立發票
   - 上傳銀行明細
   - 執行對帳

### 常見問題

#### Q: 視窗開啟後顯示空白或錯誤
A: 檢查 Console 輸出（開發者工具），可能是：
- Next.js server 未啟動
- 端口 3001 被佔用
- 資料庫初始化失敗

#### Q: 防毒軟體報毒
A: Electron 應用常被誤報，需要：
- 程式碼簽名（需要購買證書）
- 向防毒軟體廠商申報

#### Q: 檔案太大
A: 目前打包後約 500-600MB，主要是：
- Electron binaries: ~200MB
- Next.js standalone: ~310MB
- 未來可優化

## 🔧 故障排除

### 打包卡住
如果打包超過 15 分鐘沒有進展：
1. 終止打包 (Ctrl+C)
2. 刪除 `dist-electron` 目錄
3. 暫時關閉防毒軟體
4. 重新執行 `npm run electron:build:dir`

### 執行失敗
如果打包的應用無法執行：
1. 檢查 `dist-electron/win-unpacked/resources/` 是否存在
2. 檢查 `resources/standalone/server.js` 是否存在
3. 嘗試在命令行執行，查看錯誤訊息

## 📦 發布清單

打包成功後，需要提供給使用者：
- [ ] `Spreadsheet Comparator Setup 0.1.0.exe` (安裝檔)
- [ ] 使用說明文件
- [ ] 系統需求說明（Windows 10/11, 64-bit）
- [ ] 首次使用教學

## 🎉 預期結果

打包完成後，使用者將獲得：
- ✅ 雙擊即用的桌面應用
- ✅ 無需安裝 Node.js 或其他依賴
- ✅ 資料儲存在本機
- ✅ 完整的應用功能
- ✅ 專業的安裝體驗

---

**當前狀態**: 正在打包中...
**預計完成時間**: 5-10 分鐘
