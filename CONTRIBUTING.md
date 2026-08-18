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


## 介面語言（i18n）

介面支援繁體中文與英文，預設繁中。切換在導覽列右上角，偏好存在
`luk-locale` cookie —— 用 cookie 而非 localStorage，是因為 server component
也要知道語言（`<html lang>`、伺服器端算好的頁面文字）。

沒有使用 next-intl 之類的套件：`xlsx` 相依指向 SheetJS CDN，在擋住該網域的
環境下 `npm install` 會整個失敗，等於不能再新增相依。需要的功能自己寫大約
一百行，沒必要讓安裝流程更脆弱。

### 檔案

| 路徑 | 用途 |
|---|---|
| `src/lib/i18n/messages/zh-TW.ts` | 文案基準，也是型別來源 |
| `src/lib/i18n/messages/en.ts` | 英文文案，鍵必須與基準完全一致 |
| `src/lib/i18n/context.tsx` | client 端：`useT()`、`useLocale()`、`useSetLocale()`、`useFormat()` |
| `src/lib/i18n/server.ts` | server component 用：`getLocale()`、`getT()` |

### 加一則文案

1. 先加在 `zh-TW.ts`，再加在 `en.ts`。少一個鍵 TypeScript 就會報錯。
2. 在元件裡用：

```tsx
// client component
const t = useT();
<h2>{t("dashboard.title")}</h2>

// server component
const t = await getT();
<h2>{t("dashboard.title")}</h2>
```

3. 需要代入變數時用 `{name}` 佔位符：`t("todo.count", { n: 3 })`。

鍵值是型別安全的點分路徑，打錯字編譯不過。查不到的鍵會直接顯示鍵名
（例如畫面上出現 `nav.dashboard`），方便一眼認出漏翻。

### 日期與數字

不要寫死 `toLocaleDateString('zh-TW')`，改用 `useFormat()`，
它會跟著目前語言走。

### 目前進度

已完成雙語的部分：介面外框（導覽列、四個頁面標題）、概覽頁、
**立帳管理**（列表、表單、明細、PDF 下載、提醒）、
**銷帳作業**（對帳介面、統整、明細上傳、通知文案），
以及設定頁分頁與報價單版型設定。

其餘畫面仍是寫死的中文 —— 主要是設定頁裡各分頁的內容（公司管理、
解析模板、通知文案、資料修復等）。改的方式與上面完全相同：
把字串搬進兩個文案檔，元件改用 `t()`。

用這行找還沒處理的檔案：

```bash
grep -rlE "[一-龥]" src --include=*.tsx | grep -v ".test."
```

用到 `useT()` 的元件在測試裡要用 `renderWithLocale()`（`src/test/i18n.tsx`）
而不是 `render()`，否則會因為找不到 Provider 而失敗。
