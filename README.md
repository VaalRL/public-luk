# Luk — 從開報價單到對帳

一個專為小公司設計的內部工具，把一整條應收流程接起來：
開報價單、自動算稅、產生 PDF 並立帳，收款時讀取銀行明細，
依匯款帳號後五碼認出客戶並自動沖銷未結帳款。

網站：<https://vaalrl.github.io/public-luk/>（[中文](https://vaalrl.github.io/public-luk/zh.html)）

> [!WARNING]
> **本專案沒有任何身分驗證機制，僅供單機使用。**
>
> 任何能連到這個服務的人，都可以讀取全部帳務資料，也可以呼叫刪除全部資料的功能。
>
> - 打包後的 Electron 版本會綁定 `localhost`，僅本機可存取。
> - 但 `npm start` / `npm run dev` **預設綁定 `0.0.0.0`**，同網段的任何人都能存取。
>   若要在區域網路啟動，請自行設定 `HOSTNAME=localhost`，或在前面加上帶驗證的反向代理。
> - **請勿直接部署到公開網際網路。**

## 授權

本專案以 [MIT License](./LICENSE) 釋出。第三方元件的授權聲明見
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md)；`public/` 下的品牌圖示不在 MIT 範圍內。

## 文件

- [文件索引](./docs/README.md) — 使用說明、打包、測試、效能
- [貢獻指南](./CONTRIBUTING.md) — 開發環境、提交前檢查、專案慣例
- [使用說明](./docs/使用說明.md)

> [!NOTE]
> `xlsx` 依賴指向 SheetJS 官方 CDN 而非 npm registry，這是刻意的 ——
> registry 上的版本停在 2022 年的 0.18.5 且缺少後續的安全性修復。
> 詳見 [CONTRIBUTING.md](./CONTRIBUTING.md#-xlsx-依賴需要存取-cdnsheetjscom)。

## ✨ 核心功能

### 📊 儀表板 (Dashboard)
- **KPI 卡片**: 本月應收、本月實收、未沖銷總額、總應收帳款
- **營收趨勢圖**: 近 6 個月應收與實收對比
- **最近活動**: 最新建立的發票與對帳記錄

### 🏢 系統設定 (Settings)
- **公司管理**: 新增/編輯/刪除客戶公司
- **基本資料**: 公司名稱、統編、聯絡人、電話、Email、地址
- **帳號管理**: 為每個公司設定多個銀行帳號後五碼
- **解析模板**: 自定義銀行明細 Excel 解析規則
- **項目模板**: 管理常用服務項目與價格
- **通知設定**: 自定義付款提醒文案

### 📝 立帳管理 (Invoicing)
- **發票建立**: 選擇公司、設定日期、新增品項明細
- **PDF 生成**: 自動產生專業的 PDF 報價單/請款單
- **動態計算**: 自動計算小計、稅額、總計
- **品項管理**: 支援多品項，自動計算金額 (數量 × 單價)
- **發票列表**: 查看所有發票及付款狀態
- **付款提醒**: 設定發票付款提醒日期

### 🔄 對帳管理 (Reconciliation)
- **銀行明細上傳**: 支援 Excel (.xlsx, .xls) 與 CSV 格式
- **自動對帳**: 
  - 從交易摘要提取「後五碼」
  - 自動識別對應公司
  - FIFO (先進先出) 沖銷演算法
  - 自動更新發票付款狀態
  - 支援模糊匹配與人工確認
- **對帳結果**: 視覺化顯示匹配結果與未結帳單
- **快照管理**: 儲存並查看歷史對帳結果

### 🛡️ 安全與監控 (New!)
- **系統監控**: 即時監控系統健康狀態、記憶體使用量、API 回應時間
- **安全審計**: 記錄並分析安全事件 (CSRF, XSS, 速率限制等)
- **錯誤追蹤**: 自動捕捉並記錄系統錯誤
- **安全防護**: CSRF 保護、輸入清理、速率限制

## 🛠️ 技術堆疊

### 前端
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI (Radix UI)
- **State Management**: Zustand
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **PDF Generation**: @react-pdf/renderer
- **File Upload**: React Dropzone
- **Excel Parsing**: SheetJS (xlsx)
- **Drag & Drop**: @dnd-kit

### 後端
- **Database**: SQLite
- **ORM**: Prisma
- **Server Actions**: Next.js Server Actions
- **Logging**: Pino
- **Testing**: Vitest + React Testing Library

## 📦 安裝與執行

### 1. 安裝依賴
```bash
npm install
```

### 2. 設定環境變數
複製 `.env.example` 到 `.env` 並設定相關變數：
```bash
cp .env.example .env
```

### 3. 初始化資料庫
```bash
npx prisma migrate dev
```

### 4. 啟動開發伺服器
```bash
npm run dev
```

開啟瀏覽器訪問 [http://localhost:3001](http://localhost:3001)

### 5. 建置生產版本
```bash
npm run build
npm start
```

## 📁 專案結構

```
spreadsheet-comparator/
├── prisma/
│   ├── schema.prisma          # 資料庫 Schema
│   └── migrations/            # 資料庫遷移檔案
├── src/
│   ├── app/
│   │   ├── actions/           # Server Actions (後端邏輯)
│   │   ├── api/               # API Routes (監控與安全)
│   │   ├── dashboard/         # 儀表板頁面
│   │   ├── settings/          # 設定頁面
│   │   ├── invoicing/         # 立帳頁面
│   │   ├── reconciliation/    # 對帳頁面
│   │   └── page.tsx           # 首頁
│   ├── components/            # React 元件
│   │   ├── ui/                # Shadcn UI 元件
│   │   ├── features/          # 功能性元件
│   │   └── ...
│   ├── lib/
│   │   ├── prisma.ts          # Prisma Client
│   │   ├── logger.ts          # 日誌工具
│   │   ├── action-wrapper.ts  # Action 錯誤處理
│   │   ├── csrf.ts            # CSRF 保護
│   │   ├── sanitize.ts        # 輸入清理
│   │   └── security-audit.ts  # 安全審計
│   └── stores/                # Zustand 狀態管理
└── public/
```

## 🗄️ 資料庫設計

### 核心資料表
- **Company**: 客戶公司資料
- **BankAccount**: 銀行帳號後五碼
- **Invoice**: 發票/應收帳款
- **InvoiceItem**: 發票明細項目
- **BankStatement**: 銀行明細匯入記錄
- **Transaction**: 銀行交易明細
- **ReconciliationRecord**: 對帳記錄 (連接 Invoice 與 Transaction)
- **ParserTemplate**: Excel 解析規則模板

## 🚀 核心演算法

### 自動對帳邏輯 (FIFO)
1. **識別**: 從銀行交易摘要提取「後五碼」，查詢 BankAccount 找到對應的 Company。
2. **匹配**: 取得該公司所有未結清發票 (依日期排序)。
3. **沖銷**: 依序沖銷最早的發票 (FIFO - First In First Out)。
4. **更新**: 更新發票付款狀態與金額。
5. **記錄**: 產生對帳記錄與快照。

## 🧪 測試

本專案包含單元測試與效能基準測試。

```bash
# 執行所有測試
npm test

# 執行效能基準測試
npm run bench
```

## 👨‍💻 開發者

Built with ❤️ using Next.js, TypeScript, and Prisma
