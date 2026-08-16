# Todo List 標題與描述分離 + 手動排序功能

## ✨ 新功能

1. **標題與描述分離**: 任務標題和任務描述現在是獨立的欄位，會分別顯示在 todo list 列表上
2. **手動排序控制**: 移除自動排序，添加排序按鈕讓使用者可以手動切換排序方式

## 🎯 功能說明

### 1. 標題與描述分離

#### 資料庫結構

**Prisma Schema**: `prisma/schema.prisma`

```prisma
model InvoiceReminder {
  id          String   @id @default(uuid())
  date        DateTime
  title       String?  // 任務標題
  description String?  // 任務描述/備註
  text        String?  // 保留舊欄位以支援遷移
  invoiceId   String?
  invoice     Invoice?
  completed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### 顯示邏輯

**個人提醒**:
```
📝 聯絡客戶           ← 標題 (title)
   準備會議資料...     ← 描述 (description)
```

**帳單提醒**:
```
ABC公司               ← 公司名稱
INV-001 • $10,000     ← 帳單資訊
📝 記得催款           ← 備註 (title/description/text)
```

#### 創建表單

```
┌─────────────────────────────┐
│ 新增個人提醒                │
├─────────────────────────────┤
│ 提醒日期: [2025-12-01]      │
│                             │
│ 任務標題（選填）:           │
│ [聯絡客戶]                  │
│                             │
│ 任務描述（選填）:           │
│ ┌─────────────────────────┐ │
│ │準備會議資料、確認時間...│ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ [取消]  [創建提醒]          │
└─────────────────────────────┘
```

### 2. 手動排序控制

#### 之前的行為 ❌

- 自動將未完成的任務移到上方
- 用戶無法控制排序方式
- 已完成的任務總是在底部

#### 現在的行為 ✅

- **預設**: 按日期排序（不區分完成狀態）
- **點擊排序按鈕**: 切換到按狀態排序（未完成在上方）
- **再次點擊**: 切換回按日期排序

#### 排序按鈕

```
┌─────────────────────────────────────┐
│ 📅 待辦事項                         │
│                    [按狀態] [新增提醒] │
└─────────────────────────────────────┘
```

- 按鈕文字顯示**下一個**排序方式
- 當前按狀態排序時，按鈕顯示「按日期」
- 當前按日期排序時，按鈕顯示「按狀態」

## 📝 實現細節

### 1. 類型定義

**檔案**: `src/components/dashboard-todo-list.tsx`

```typescript
type Reminder = {
    id: string;
    date: Date;
    title?: string | null;        // 新增：任務標題
    description?: string | null;   // 新增：任務描述
    text?: string | null;          // 保留：支援舊資料
    invoiceId: string | null;
    completed: boolean;
    invoice?: { /* ... */ } | null;
};
```

### 2. 排序邏輯

```typescript
const [sortByCompletion, setSortByCompletion] = useState(false);

// 排序邏輯：可選擇是否將未完成的移到上方
const sortedReminders = [...reminders].sort((a, b) => {
    if (sortByCompletion && a.completed !== b.completed) {
        return a.completed ? 1 : -1;  // 未完成在前
    }
    // 預設按日期排序
    return new Date(a.date).getTime() - new Date(b.date).getTime();
});
```

### 3. 顯示邏輯

```typescript
{reminder.invoice ? (
    // 帳單提醒
    <>
        <div className="font-medium">{reminder.invoice.company.name}</div>
        <div className="text-sm text-muted-foreground">
            {reminder.invoice.invoiceNumber} • ${reminder.invoice.totalAmount}
        </div>
        {/* 帳單的備註 */}
        {(reminder.title || reminder.description || reminder.text) && (
            <div className="text-sm text-primary">
                📝 {reminder.title || reminder.description || reminder.text}
            </div>
        )}
    </>
) : (
    // 個人提醒
    <>
        {/* 標題 */}
        <div className="font-medium">
            📝 {reminder.title || reminder.text || "待辦任務"}
        </div>
        {/* 描述 */}
        {reminder.description && (
            <div className="text-sm text-muted-foreground">
                {reminder.description}
            </div>
        )}
    </>
)}
```

### 4. Server Action

**檔案**: `src/app/actions/invoice.ts`

```typescript
export async function createStandaloneReminder(
    date: Date,
    title: string | null,
    description: string | null
) {
    const reminder = await prisma.invoiceReminder.create({
        data: {
            date,
            title: title || null,
            description: description || null,
        },
    });
    return reminder;
}
```

## 🎨 用戶體驗

### 創建任務

#### 案例 1: 完整填寫
```
輸入:
- 標題: "聯絡客戶"
- 描述: "準備會議資料、確認時間"

顯示:
📝 聯絡客戶
   準備會議資料、確認時間
```

#### 案例 2: 只填標題
```
輸入:
- 標題: "聯絡客戶"
- 描述: (留空)

顯示:
📝 聯絡客戶
```

#### 案例 3: 只填描述
```
輸入:
- 標題: (留空)
- 描述: "準備會議資料"

顯示:
📝 待辦任務
   準備會議資料
```

#### 案例 4: 全部留空
```
輸入:
- 標題: (留空)
- 描述: (留空)

顯示:
📝 待辦任務
```

### 排序控制

#### 按日期排序（預設）
```
今日任務：
☐ 📝 任務A (2025/12/01)
☑ 📝 任務B (2025/12/02)  ← 已完成但日期較晚
☐ 📝 任務C (2025/12/03)
```

#### 按狀態排序
```
今日任務：
☐ 📝 任務A (2025/12/01)
☐ 📝 任務C (2025/12/03)
☑ 📝 任務B (2025/12/02)  ← 已完成移到底部
```

## 🔄 相關檔案

### 修改的檔案

1. **`prisma/schema.prisma`**
   - 添加 `title` 和 `description` 欄位
   - 保留 `text` 欄位以支援舊資料

2. **`src/components/dashboard-todo-list.tsx`**
   - 更新類型定義
   - 添加 `sortByCompletion` 狀態
   - 修改排序邏輯
   - 更新顯示邏輯
   - 添加排序按鈕
   - 更新表單（兩個欄位）

3. **`src/app/actions/invoice.ts`**
   - 更新 `createStandaloneReminder` 函數簽名
   - 接受 `title` 和 `description` 參數

### 資料庫遷移

```bash
# 已執行
npx prisma db push
npx prisma generate
```

## 🧪 測試清單

### 標題與描述

- [x] 創建只有標題的任務
- [x] 創建只有描述的任務
- [x] 創建標題和描述都有的任務
- [x] 創建標題和描述都沒有的任務（顯示「待辦任務」）
- [x] 標題和描述在列表上分別顯示
- [x] 舊資料（只有 text 欄位）仍然正常顯示

### 排序功能

- [x] 預設按日期排序
- [x] 點擊排序按鈕切換到按狀態排序
- [x] 再次點擊切換回按日期排序
- [x] 按鈕文字正確顯示下一個排序方式
- [x] 按鈕樣式在不同狀態下正確切換

## 💡 設計考量

### 為什麼分離標題和描述？

1. **更清晰的資訊層級**: 標題是主要資訊，描述是補充細節
2. **更好的可讀性**: 在列表中可以快速掃描標題
3. **更靈活的使用**: 用戶可以選擇只填標題或兩者都填

### 為什麼移除自動排序？

1. **用戶控制**: 讓用戶決定如何查看任務
2. **保持順序**: 有些用戶可能希望按日期查看，即使有已完成的任務
3. **減少閃爍**: 自動排序會導致列表項目移動，可能造成視覺干擾

### 為什麼保留 text 欄位？

1. **向後兼容**: 支援舊資料的顯示
2. **平滑遷移**: 不需要資料遷移腳本
3. **靈活性**: 可以作為備用欄位

## 🎉 總結

這次更新帶來了兩個重要的改進：

### 1. 標題與描述分離

- ✅ **更清晰**: 資訊層級分明
- ✅ **更靈活**: 可以只填標題或兩者都填
- ✅ **更專業**: 符合任務管理的最佳實踐

### 2. 手動排序控制

- ✅ **用戶控制**: 讓用戶決定如何查看
- ✅ **減少干擾**: 不會自動移動任務位置
- ✅ **更直觀**: 一鍵切換排序方式

現在您的 Todo List 更加強大和靈活了！🚀

## 📸 視覺對比

### 之前
```
📝 個人提醒
   聯絡客戶、準備會議資料...
```

### 現在
```
📝 聯絡客戶
   準備會議資料、確認時間
```

更清晰、更專業！✨
