# 貢獻指南

## 開發環境

```bash
npm install
npx prisma migrate deploy   # 建立資料庫
npm run dev                 # http://localhost:3001
```

### ⚠️ `xlsx` 依賴需要存取 cdn.sheetjs.com

`package.json` 中的 `xlsx` 指向 SheetJS 官方 CDN 的 tarball，而非 npm registry：

```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

**這是刻意的，請不要改成 `npm install xlsx`。** SheetJS 自 0.18.5 之後
就不再發布到 npm registry，registry 上的最新版本停留在 2022 年的 0.18.5，
缺少之後修復的安全性問題（原型污染、ReDoS）。改用 registry 版本等於降級。

如果你的網路環境擋住 `cdn.sheetjs.com`，請設定對應的 proxy 或
allowlist 後再執行 `npm install`。

## 提交前必須通過

```bash
npx tsc --noEmit    # 型別檢查，必須 0 errors
npm run lint        # ESLint，必須 0 problems
npm test -- --run   # 測試，必須全數通過
npm run build       # 建置必須成功
```

## 專案慣例

- **TDD**：先寫測試再實作，測試檔案與被測檔案放在一起（`*.test.ts`）
- **不要用 `any`**：資料庫相關型別一律使用 Prisma 產生的型別
- **Server Action 一律經過 `withErrorHandling` / `withValidation`**
- **多步驟寫入必須包在 `prisma.$transaction` 內**
- **禁止在 root 目錄新增檔案**，文件放 `docs/`、腳本放 `scripts/`
- **單一真實來源**：延伸既有實作，不要平行寫第二套；動手前先全庫搜尋
- **先修再擴充**：發現既有缺陷時先修正，不要繞過它加新功能
- **發票餘額一律走 `syncInvoiceBalance()`**，不要自行計算 `paidAmount`


## 資料庫變更

Schema 變更一律透過 migration，不要依賴執行期的欄位補丁：

```bash
npx prisma migrate dev --name 描述性名稱
```

`prisma/dev.db` 是**空白的初始資料庫**，請勿把使用中、含有營運資料的
資料庫 commit 回來。
