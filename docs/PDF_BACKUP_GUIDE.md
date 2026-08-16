# PDF 自動備份功能指南

## 功能概述

系統會在每次產生 PDF 發票時，自動將 PDF 檔案備份到本地資料夾，並按日期分類儲存。

## 目錄結構

備份檔案會儲存在專案根目錄的 `backups/pdfs/` 目錄下，按照以下階層結構：

```
backups/
└── pdfs/
    └── 2025/
        └── 12/
            └── 03/
                ├── invoice-ABC123_20251203_143052.pdf
                ├── invoice-ABC123_20251203_143052.json  (metadata)
                ├── invoice-DEF456_20251203_150230.pdf
                └── invoice-DEF456_20251203_150230.json
```

### 檔案命名格式

- **PDF 檔案**: `{原始檔名}_{日期}_{時間}.pdf`
  - 例如: `invoice-ABC123_20251203_143052.pdf`
  - 日期格式: `YYYYMMDD`
  - 時間格式: `HHMMSS`

- **Metadata 檔案**: `{PDF檔名}.json`
  - 包含發票的詳細資訊（發票號碼、公司名稱、金額等）

## 配置選項

備份功能可在 `src/app/actions/pdf-backup.ts` 中配置：

```typescript
const PDF_BACKUP_CONFIG = {
    // 備份根目錄
    backupRoot: "backups/pdfs",

    // 是否啟用備份
    enabled: true,

    // 目錄結構格式
    structure: "date-hierarchy" // 或 "year-month" 或 "flat"
};
```

### 目錄結構選項

1. **date-hierarchy** (預設)
   ```
   backups/pdfs/2025/12/03/invoice-xxx.pdf
   ```

2. **year-month**
   ```
   backups/pdfs/2025-12/invoice-xxx.pdf
   ```

3. **flat**
   ```
   backups/pdfs/invoice-xxx.pdf
   ```

## 功能特性

### 1. 自動備份
- 每次下載 PDF 時自動觸發備份
- 備份失敗不會影響正常下載功能
- 開發模式下會在 Console 顯示備份路徑

### 2. Metadata 記錄
每個 PDF 都會伴隨一個 JSON 檔案，記錄以下資訊：
- 檔案名稱
- 原始檔名
- 時間戳記
- 發票號碼
- 公司名稱
- 金額
- 檔案大小

範例 `invoice-ABC123_20251203_143052.json`:
```json
{
  "fileName": "invoice-ABC123_20251203_143052.pdf",
  "originalFileName": "invoice-ABC123.pdf",
  "timestamp": "2025-12-03T14:30:52.123Z",
  "invoiceNumber": "ABC123",
  "companyName": "測試科技股份有限公司",
  "amount": 52500,
  "fileSize": 245678
}
```

### 3. 備份管理 API

#### 獲取指定日期的備份
```typescript
import { getBackupsByDate } from "@/app/actions/pdf-backup";

const result = await getBackupsByDate(new Date("2025-12-03"));
// result.files: ["backups/pdfs/2025/12/03/invoice-xxx.pdf", ...]
```

#### 清理舊備份（保留最近 90 天）
```typescript
import { cleanupOldBackups } from "@/app/actions/pdf-backup";

const result = await cleanupOldBackups(90);
// result.deletedCount: 25
```

#### 獲取備份統計
```typescript
import { getBackupStats } from "@/app/actions/pdf-backup";

const result = await getBackupStats();
// result.stats: {
//   totalFiles: 150,
//   totalSize: 36700000,  // bytes
//   oldestBackup: Date,
//   newestBackup: Date
// }
```

## 使用場景

### 1. 查詢特定日期的發票
```bash
# 查看 2025年12月3日 的所有備份
cd backups/pdfs/2025/12/03/
ls *.pdf
```

### 2. 搜尋特定發票號碼
```bash
# Windows PowerShell
Get-ChildItem -Path "backups/pdfs" -Recurse -Filter "*ABC123*.pdf"

# Linux/Mac
find backups/pdfs -name "*ABC123*.pdf"
```

### 3. 定期清理（建議在 Cron Job 或排程任務中執行）
```typescript
// 每週自動清理超過 90 天的備份
import { cleanupOldBackups } from "@/app/actions/pdf-backup";

async function weeklyCleanup() {
    const result = await cleanupOldBackups(90);
    console.log(`已清理 ${result.deletedCount} 個舊備份`);
}
```

## 磁碟空間管理

### 預估空間需求
- 平均每個 PDF: 200-300 KB
- 每月 100 張發票: 約 25 MB
- 保留 90 天: 約 75 MB

### 空間不足時的處理
1. 調整保留天數（修改 `cleanupOldBackups` 的參數）
2. 改用 `year-month` 或 `flat` 結構
3. 定期手動清理舊備份

## 安全性考量

### 1. .gitignore 配置
備份目錄已加入 `.gitignore`，不會被提交到 Git：
```
/backups/
backups/
```

### 2. 權限設定
確保備份目錄只有應用程式和管理員可以存取：
```bash
# Linux/Mac
chmod 700 backups/

# Windows
# 使用檔案總管 → 右鍵 → 內容 → 安全性 → 進階
```

### 3. 備份加密（選用）
若需要加密備份，可以修改 `savePdfBackup` 函數加入加密邏輯。

## 故障排除

### 問題 1: 備份目錄無法創建
**原因**: 權限不足

**解決方案**:
```bash
# 手動創建目錄
mkdir -p backups/pdfs

# 設定權限
chmod -R 755 backups/
```

### 問題 2: 備份失敗但不影響下載
**原因**: 磁碟空間不足或權限問題

**解決方案**:
1. 檢查磁碟空間: `df -h` (Linux/Mac) 或 `Get-PSDrive` (Windows)
2. 檢查 Console 錯誤訊息
3. 檢查目錄權限

### 問題 3: 找不到備份檔案
**原因**: 可能是目錄結構配置變更

**解決方案**:
檢查 `PDF_BACKUP_CONFIG.structure` 設定，並在對應目錄尋找。

## 最佳實踐

1. **定期備份到外部儲存**
   - 每週將 `backups/` 目錄複製到外部硬碟或雲端儲存

2. **設定自動清理**
   - 建立排程任務定期執行 `cleanupOldBackups()`

3. **監控磁碟空間**
   - 定期執行 `getBackupStats()` 檢查備份使用量

4. **測試還原**
   - 定期測試從備份還原 PDF 的流程

## 開發模式提示

在開發模式下（`NODE_ENV === 'development'`），每次備份成功時會在 Console 顯示：
```
💾 PDF 已自動備份: backups/pdfs/2025/12/03/invoice-ABC123_20251203_143052.pdf
```

## 相關檔案

- `src/app/actions/pdf-backup.ts` - 備份邏輯實作
- `src/components/invoice-download-button.tsx` - 整合備份功能
- `backups/pdfs/` - 備份儲存目錄（自動創建）

---

**版本**: 1.0
**最後更新**: 2025-12-03
**維護者**: 開發團隊
