# Todo List 自訂標題功能

## ✨ 新功能

允許用戶在創建個人提醒時自訂任務標題，如果不輸入標題則預設顯示「待辦任務」。

## 🎯 功能說明

### 之前的行為

- 所有個人提醒的標題都固定顯示為「📝 個人提醒」
- 用戶輸入的內容顯示為副標題（較小的文字）

### 現在的行為

- 用戶輸入的內容作為**主標題**顯示
- 如果用戶沒有輸入任何內容，預設顯示「📝 待辦任務」
- 標題欄位變為**選填**，不再強制要求輸入

## 📝 實現細節

### 1. UI 顯示邏輯

**檔案**: `src/components/dashboard-todo-list.tsx`

```typescript
// 個人提醒的顯示邏輯
{reminder.invoice ? (
    // 帳單相關的提醒
    <>
        <div className="font-medium truncate">{reminder.invoice.company.name}</div>
        <div className="text-sm text-muted-foreground">
            {reminder.invoice.invoiceNumber} • ${reminder.invoice.totalAmount}
        </div>
        {reminder.text && (
            <div className="text-sm text-primary mt-1 font-medium truncate">
                📝 {reminder.text}
            </div>
        )}
    </>
) : (
    // 個人提醒：使用 text 作為標題，沒有則顯示「待辦任務」
    <div className="font-medium truncate">
        📝 {reminder.text || "待辦任務"}
    </div>
)}
```

### 2. 表單修改

**檔案**: `src/components/dashboard-todo-list.tsx`

```typescript
<Label htmlFor="reminder-text">任務標題（選填）</Label>
<Input
    id="reminder-text"
    placeholder="例如：聯絡客戶、準備資料...（留空則顯示「待辦任務」）"
    value={newReminderText}
    onChange={(e) => setNewReminderText(e.target.value)}
    disabled={isCreating}
/>
```

### 3. 創建邏輯

**檔案**: `src/components/dashboard-todo-list.tsx`

```typescript
const handleCreateReminder = async () => {
    // 允許空標題，將使用預設值「待辦任務」
    try {
        setIsCreating(true);
        // 如果沒有輸入標題，傳入 null
        await createStandaloneReminder(
            new Date(newReminderDate), 
            newReminderText.trim() || null
        );
        setIsDialogOpen(false);
        setNewReminderText("");
        setNewReminderDate(format(new Date(), "yyyy-MM-dd"));
        router.refresh();
    } catch (error) {
        toast({
            title: "創建失敗",
            description: "創建提醒失敗，請稍後再試",
            variant: "destructive",
        });
    } finally {
        setIsCreating(false);
    }
};
```

### 4. Server Action 修改

**檔案**: `src/app/actions/invoice.ts`

```typescript
export async function createStandaloneReminder(date: Date, text: string | null) {
    const reminder = await prisma.invoiceReminder.create({
        data: {
            date,
            text: text || null, // 如果是空字串，存為 null
        },
    });
    // 不調用 revalidatePath，讓客戶端使用 router.refresh() 控制刷新時機
    return reminder;
}
```

## 🎨 用戶體驗

### 創建任務時

1. **有輸入標題**:
   ```
   用戶輸入: "聯絡客戶"
   顯示結果: 📝 聯絡客戶
   ```

2. **沒有輸入標題**:
   ```
   用戶輸入: (留空)
   顯示結果: 📝 待辦任務
   ```

### 任務列表顯示

```
今日任務：
┌─────────────────────────┐
│ ☐ 📝 聯絡客戶           │  ← 用戶自訂標題
│    2025/12/01           │
├─────────────────────────┤
│ ☐ 📝 待辦任務           │  ← 預設標題（用戶未輸入）
│    2025/12/01           │
├─────────────────────────┤
│ ☐ ABC公司               │  ← 帳單相關提醒
│    INV-001 • $10,000    │
│    📝 記得催款          │  ← 帳單的備註
└─────────────────────────┘
```

## 📊 資料庫結構

**Prisma Schema**: `prisma/schema.prisma`

```prisma
model InvoiceReminder {
  id        String   @id @default(uuid())
  date      DateTime
  text      String?  // 可選：任務標題或備註
  invoiceId String?  // 可選：關聯的帳單 ID
  invoice   Invoice? @relation(fields: [invoiceId], references: [id])
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**說明**:
- `text` 欄位為可選（`String?`）
- 對於個人提醒：`text` 是任務標題
- 對於帳單提醒：`text` 是額外的備註

## 🔄 相關檔案

修改的檔案：
- ✅ `src/components/dashboard-todo-list.tsx`
  - 修改顯示邏輯，將 `text` 作為標題
  - 更新表單標籤為「任務標題（選填）」
  - 移除必填驗證
  - 添加預設值「待辦任務」
- ✅ `src/app/actions/invoice.ts`
  - 修改 `createStandaloneReminder` 接受 `string | null`
  - 移除 `revalidatePath` 調用

## 🧪 測試案例

### 測試 1: 創建有標題的任務
```
步驟:
1. 點擊「新增提醒」
2. 選擇日期
3. 輸入標題: "準備會議資料"
4. 點擊「創建提醒」

預期結果:
✅ 任務創建成功
✅ 顯示: 📝 準備會議資料
```

### 測試 2: 創建無標題的任務
```
步驟:
1. 點擊「新增提醒」
2. 選擇日期
3. 標題留空
4. 點擊「創建提醒」

預期結果:
✅ 任務創建成功
✅ 顯示: 📝 待辦任務
```

### 測試 3: 創建只有空格的標題
```
步驟:
1. 點擊「新增提醒」
2. 選擇日期
3. 輸入標題: "   " (只有空格)
4. 點擊「創建提醒」

預期結果:
✅ 任務創建成功
✅ 顯示: 📝 待辦任務 (空格被 trim 掉)
```

### 測試 4: 帳單提醒的備註
```
情境: 帳單提醒仍然可以有備註

顯示:
ABC公司
INV-001 • $10,000
📝 記得催款  ← 這是備註，不是標題
```

## 💡 設計考量

### 為什麼選擇「待辦任務」作為預設值？

1. **通用性**: 「待辦任務」是一個通用的描述，適用於各種情況
2. **清晰性**: 比「個人提醒」更明確地表達這是一個需要完成的任務
3. **簡潔性**: 比「未命名任務」或「無標題」更友好

### 為什麼允許空標題？

1. **快速創建**: 用戶可以快速創建任務，稍後再編輯（如果需要）
2. **靈活性**: 有些任務可能不需要特定的標題
3. **用戶友好**: 不強制用戶輸入，減少摩擦

### 為什麼不添加編輯功能？

目前的實現專注於創建功能。如果需要編輯功能，可以在未來添加：
- 點擊任務可以編輯標題
- 添加「編輯」按鈕
- 支持拖放排序等

## 🎉 總結

這個功能提升了 Todo List 的靈活性和用戶體驗：

- ✅ **更個性化**: 用戶可以自訂任務標題
- ✅ **更快速**: 不強制輸入，可以快速創建
- ✅ **更清晰**: 預設值「待辦任務」比「個人提醒」更明確
- ✅ **保持一致**: 帳單提醒的備註功能不受影響

現在用戶可以創建更有意義的任務，同時保持快速創建的便利性！🚀
