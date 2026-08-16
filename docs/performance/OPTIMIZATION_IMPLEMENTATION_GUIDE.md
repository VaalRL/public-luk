# PDF Generation Optimization - Implementation Guide

> 本指南提供逐步實作優化方案的詳細步驟，包含程式碼範例和測試驗證

## 目錄
- [Phase 1: 快速勝利 (Week 1)](#phase-1-快速勝利-week-1)
- [Phase 2: 穩固基礎 (Week 2)](#phase-2-穩固基礎-week-2)
- [Phase 3: 優化完善 (Week 3-4)](#phase-3-優化完善-week-3-4)

---

## Phase 1: 快速勝利 (Week 1)

### 優化 1: 字體子集化 (Day 1-2)

#### 目標
將 2.7MB 的字體檔案縮小到 300-500KB

#### 實作步驟

**Step 1: 安裝工具**

```bash
# 使用 Python fonttools
pip install fonttools brotli

# 或使用 glyphhanger (Node.js)
npm install -g glyphhanger
```

**Step 2: 生成字體子集**

```bash
# 方法 A: 使用 fonttools (推薦)
# 常用中文字 + 英數字 + 標點符號
pyftsubset public/fonts/noto-sans-tc-chinese-traditional-400-normal.woff \
  --unicodes="U+4E00-9FFF,U+3000-303F,U+FF00-FFEF,U+0030-0039,U+0041-005A,U+0061-007A,U+0020-007E" \
  --output-file=public/fonts/noto-sans-tc-400-subset.woff \
  --flavor=woff \
  --layout-features="*" \
  --desubroutinize

pyftsubset public/fonts/noto-sans-tc-chinese-traditional-700-normal.woff \
  --unicodes="U+4E00-9FFF,U+3000-303F,U+FF00-FFEF,U+0030-0039,U+0041-005A,U+0061-007A,U+0020-007E" \
  --output-file=public/fonts/noto-sans-tc-700-subset.woff \
  --flavor=woff \
  --layout-features="*" \
  --desubroutinize
```

**更精確的子集 (根據實際使用字符)**:

```bash
# Step 2.1: 分析專案中實際使用的中文字
# 創建分析腳本
cat > scripts/analyze-chinese-chars.js << 'EOF'
const fs = require('fs');
const path = require('path');

// 收集所有中文字符
const chineseChars = new Set();

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // 匹配中文字符 (Unicode 範圍: 4E00-9FFF)
  const matches = content.match(/[\u4E00-\u9FFF]/g);
  if (matches) {
    matches.forEach(char => chineseChars.add(char));
  }
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!['node_modules', '.next', 'dist'].includes(file)) {
        scanDirectory(filePath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.json')) {
      scanFile(filePath);
    }
  });
}

// 掃描專案
scanDirectory('./src');
scanDirectory('./prisma');

// 輸出結果
const chars = Array.from(chineseChars).sort();
console.log(`找到 ${chars.length} 個不重複的中文字符`);

// 生成 Unicode 範圍
const unicodes = chars.map(char =>
  'U+' + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')
).join(',');

fs.writeFileSync('scripts/font-subset-chars.txt', unicodes);
console.log('已寫入 scripts/font-subset-chars.txt');
EOF

node scripts/analyze-chinese-chars.js

# Step 2.2: 使用分析結果生成子集
# 讀取 font-subset-chars.txt 並生成子集
CHARS=$(cat scripts/font-subset-chars.txt)
pyftsubset public/fonts/noto-sans-tc-chinese-traditional-400-normal.woff \
  --unicodes="$CHARS,U+0020-007E" \
  --output-file=public/fonts/noto-sans-tc-400-subset.woff \
  --flavor=woff
```

**Step 3: 更新字體註冊**

```typescript
// src/lib/pdf-fonts.ts
import { Font } from '@react-pdf/renderer';

let fontsRegistered = false;

export function registerPdfFonts() {
    if (fontsRegistered) return;

    try {
        Font.register({
            family: 'Noto Sans TC',
            fonts: [
                {
                    // 🆕 使用子集化字體
                    src: '/fonts/noto-sans-tc-400-subset.woff',
                    fontWeight: 400,
                },
                {
                    // 🆕 使用子集化字體
                    src: '/fonts/noto-sans-tc-700-subset.woff',
                    fontWeight: 700,
                }
            ]
        });

        fontsRegistered = true;
        console.log('✅ PDF fonts registered successfully (subset version)');
    } catch (error) {
        console.error('❌ Error registering PDF fonts:', error);
    }
}
```

**Step 4: 添加到 npm scripts**

```json
// package.json
{
  "scripts": {
    "font:analyze": "node scripts/analyze-chinese-chars.js",
    "font:subset": "bash scripts/subset-fonts.sh",
    "font:all": "npm run font:analyze && npm run font:subset"
  }
}
```

**Step 5: 驗證**

```bash
# 檢查檔案大小
ls -lh public/fonts/*.woff

# 預期結果:
# noto-sans-tc-400-subset.woff: 300-500KB (減少 70-80%)
# noto-sans-tc-700-subset.woff: 300-500KB
```

**測試檢查清單**:
- [ ] 字體檔案大小 < 500KB
- [ ] 常用中文字正常顯示
- [ ] 英數字和標點符號正常顯示
- [ ] PDF 生成速度提升 40-60%

---

### 優化 2: React 組件優化 (Day 3-4)

#### 目標
減少不必要的重渲染和函數重建

#### 實作步驟

**Step 1: 拆分子組件**

```typescript
// src/components/pdf/InvoiceTableRow.tsx
import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

interface InvoiceTableRowProps {
    item: {
        category?: string;
        name: string;
        content?: string;
        description?: string;
        quantity: number;
        price: number;
        amount: number;
        note?: string;
    };
    defaultCategory: string;
    styles: any;
}

export const InvoiceTableRow = React.memo(({
    item,
    defaultCategory,
    styles
}: InvoiceTableRowProps) => (
    <View style={styles.tableRow}>
        <Text style={[styles.tableCell, styles.colCategory]}>
            {item.category || defaultCategory}
        </Text>
        <Text style={[styles.tableCell, styles.colName]}>
            {item.name}
        </Text>
        <Text style={[styles.tableCell, styles.colContent]}>
            {item.content || item.description || ""}
        </Text>
        <Text style={[styles.tableCell, styles.colQty]}>
            {item.quantity}
        </Text>
        <Text style={[styles.tableCell, styles.colPrice]}>
            ${item.price.toLocaleString()}
        </Text>
        <Text style={[styles.tableCell, styles.colTotal]}>
            ${item.amount.toLocaleString()}
        </Text>
        <Text style={[styles.tableCell, styles.colNote, styles.lastCell]}>
            {item.note || ""}
        </Text>
    </View>
));

InvoiceTableRow.displayName = 'InvoiceTableRow';
```

```typescript
// src/components/pdf/InvoiceTableHeader.tsx
import React from 'react';
import { View, Text } from '@react-pdf/renderer';

interface InvoiceTableHeaderProps {
    title: string;
    styles: any;
}

export const InvoiceTableHeader = React.memo(({
    title,
    styles
}: InvoiceTableHeaderProps) => (
    <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.tableCell, styles.colCategory]}>{title}</Text>
        <Text style={[styles.tableCell, styles.colName]}>項目名稱</Text>
        <Text style={[styles.tableCell, styles.colContent]}>內容</Text>
        <Text style={[styles.tableCell, styles.colQty]}>數量</Text>
        <Text style={[styles.tableCell, styles.colPrice]}>單價</Text>
        <Text style={[styles.tableCell, styles.colTotal]}>總價</Text>
        <Text style={[styles.tableCell, styles.colNote, styles.lastCell]}>備註</Text>
    </View>
));

InvoiceTableHeader.displayName = 'InvoiceTableHeader';
```

```typescript
// src/components/pdf/InvoiceTable.tsx
import React from 'react';
import { View } from '@react-pdf/renderer';
import { InvoiceTableHeader } from './InvoiceTableHeader';
import { InvoiceTableRow } from './InvoiceTableRow';

interface InvoiceTableProps {
    items: any[];
    title: string;
    defaultCategory: string;
    styles: any;
}

export const InvoiceTable = React.memo(({
    items,
    title,
    defaultCategory,
    styles
}: InvoiceTableProps) => {
    if (items.length === 0) return null;

    return (
        <View style={styles.table}>
            <InvoiceTableHeader title={title} styles={styles} />
            {items.map((item, index) => (
                <InvoiceTableRow
                    key={index}
                    item={item}
                    defaultCategory={defaultCategory}
                    styles={styles}
                />
            ))}
        </View>
    );
});

InvoiceTable.displayName = 'InvoiceTable';
```

**Step 2: 更新主組件**

```typescript
// src/components/invoice-pdf.tsx (優化版)
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { registerPdfFonts } from '@/lib/pdf-fonts';
import { InvoiceTable } from './pdf/InvoiceTable';

registerPdfFonts();

// 樣式定義保持不變
const styles = StyleSheet.create({
    // ... (與原本相同)
});

export const InvoicePdfDocument = React.memo(({ invoice }: InvoicePdfProps) => {
    // 🆕 預計算所有資料 (包含格式化)
    const computedData = React.useMemo(() => {
        const items = typeof invoice.items === 'string'
            ? JSON.parse(invoice.items)
            : invoice.items;

        const serviceItems = items.filter(
            (item: any) => !item.type || item.type === 'service'
        );
        const reimbursementItems = items.filter(
            (item: any) => item.type === 'reimbursement'
        );

        const serviceSubtotal = serviceItems.reduce(
            (sum: number, item: any) => sum + item.amount,
            0
        );
        const serviceTax = Math.round(
            serviceSubtotal * (invoice.taxAmount > 0 ? 0.05 : 0)
        );
        const serviceTotal = serviceSubtotal + serviceTax;
        const reimbursementTotal = reimbursementItems.reduce(
            (sum: number, item: any) => sum + item.amount,
            0
        );
        const grandTotal = serviceTotal + reimbursementTotal;

        // 🆕 預格式化日期
        const formattedDate = format(new Date(invoice.date), 'yyyy/MM/dd');

        // 🆕 預格式化金額
        const formattedAmounts = {
            serviceSubtotal: serviceSubtotal.toLocaleString(),
            serviceTax: serviceTax.toLocaleString(),
            serviceTotal: serviceTotal.toLocaleString(),
            reimbursementTotal: reimbursementTotal.toLocaleString(),
            grandTotal: grandTotal.toLocaleString(),
        };

        return {
            serviceItems,
            reimbursementItems,
            formattedDate,
            formattedAmounts,
            provider: invoice.provider || {
                name: "範例科技有限公司",
                taxId: "12345678",
                contactName: "王小明",
                email: "contact@example.com",
                phone: "0900000000",
                address: "",
                logoPath: null,
                stampPath: null,
            },
            company: invoice.company,
        };
    }, [invoice]);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    {computedData.provider.logoPath && (
                        <View style={styles.logoContainer}>
                            <Image
                                src={computedData.provider.logoPath}
                                style={styles.logo}
                            />
                        </View>
                    )}
                    <Text style={styles.title}>{invoice.title || "報價單"}</Text>
                </View>

                {/* Header Info */}
                <View style={{ marginBottom: 20, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                        <Text style={{ fontWeight: 'bold' }}>日期：</Text>
                        <Text>{computedData.formattedDate}</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={{ fontWeight: 'bold' }}>單號：</Text>
                        <Text>{invoice.invoiceNumber || 'N/A'}</Text>
                    </View>
                </View>

                {/* 🆕 使用拆分的 InvoiceTable 組件 */}
                <InvoiceTable
                    items={computedData.serviceItems}
                    title="服務項目"
                    defaultCategory="服務項目"
                    styles={styles}
                />

                {/* Service Totals */}
                {computedData.serviceItems.length > 0 && (
                    <View style={styles.totals}>
                        <View style={styles.totalRow}>
                            <Text>銷售金額 (未稅)：</Text>
                            <Text>${computedData.formattedAmounts.serviceSubtotal}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text>營業稅 (5%)：</Text>
                            <Text>${computedData.formattedAmounts.serviceTax}</Text>
                        </View>
                        <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 4 }]}>
                            <Text style={{ fontWeight: 'bold' }}>服務總計 (含稅)：</Text>
                            <Text style={{ fontWeight: 'bold' }}>
                                ${computedData.formattedAmounts.serviceTotal}
                            </Text>
                        </View>
                    </View>
                )}

                {/* 🆕 使用拆分的 InvoiceTable 組件 */}
                <InvoiceTable
                    items={computedData.reimbursementItems}
                    title="代墊費用"
                    defaultCategory="代墊費用"
                    styles={styles}
                />

                {/* Reimbursement Totals */}
                {computedData.reimbursementItems.length > 0 && (
                    <View style={styles.totals}>
                        <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 4 }]}>
                            <Text style={{ fontWeight: 'bold' }}>代墊小計：</Text>
                            <Text style={{ fontWeight: 'bold' }}>
                                ${computedData.formattedAmounts.reimbursementTotal}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Grand Total */}
                <View style={[styles.totals, { marginTop: 20 }]}>
                    <View style={[styles.totalRow, { borderTopWidth: 2, borderTopColor: '#000', paddingTop: 4 }]}>
                        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>總計金額：</Text>
                        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>
                            ${computedData.formattedAmounts.grandTotal}
                        </Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
});

InvoicePdfDocument.displayName = 'InvoicePdfDocument';
```

**測試檢查清單**:
- [ ] PDF 正常生成
- [ ] 所有內容正確顯示
- [ ] 效能提升 15-25%
- [ ] 無 React warning

---

### 優化 3: 圖片優化基礎 (Day 5)

#### 目標
限制圖片大小和格式

#### 實作步驟

**Step 1: 創建圖片驗證工具**

```typescript
// src/lib/image-validator.ts
export interface ImageValidationResult {
    valid: boolean;
    error?: string;
    warnings?: string[];
    metadata?: {
        width: number;
        height: number;
        size: number;
        format: string;
    };
}

export const IMAGE_CONSTRAINTS = {
    maxWidth: 400,
    maxHeight: 400,
    maxSize: 200 * 1024, // 200KB
    allowedFormats: ['image/png', 'image/jpeg', 'image/webp'],
};

export async function validateImage(
    file: File | string
): Promise<ImageValidationResult> {
    const warnings: string[] = [];

    try {
        let blob: Blob;
        let url: string;

        if (typeof file === 'string') {
            // 從 URL 載入
            const response = await fetch(file);
            blob = await response.blob();
            url = file;
        } else {
            // 從 File 物件
            blob = file;
            url = URL.createObjectURL(file);
        }

        // 檢查檔案大小
        if (blob.size > IMAGE_CONSTRAINTS.maxSize) {
            return {
                valid: false,
                error: `圖片大小 ${(blob.size / 1024).toFixed(2)}KB 超過限制 ${IMAGE_CONSTRAINTS.maxSize / 1024}KB`,
            };
        }

        // 檢查格式
        if (!IMAGE_CONSTRAINTS.allowedFormats.includes(blob.type)) {
            return {
                valid: false,
                error: `不支援的圖片格式: ${blob.type}`,
            };
        }

        // 載入圖片以獲取尺寸
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });

        // 檢查尺寸
        if (img.width > IMAGE_CONSTRAINTS.maxWidth || img.height > IMAGE_CONSTRAINTS.maxHeight) {
            warnings.push(
                `圖片尺寸 ${img.width}x${img.height} 超過建議值 ${IMAGE_CONSTRAINTS.maxWidth}x${IMAGE_CONSTRAINTS.maxHeight}`
            );
        }

        // 清理
        if (typeof file !== 'string') {
            URL.revokeObjectURL(url);
        }

        return {
            valid: true,
            warnings: warnings.length > 0 ? warnings : undefined,
            metadata: {
                width: img.width,
                height: img.height,
                size: blob.size,
                format: blob.type,
            },
        };
    } catch (error) {
        return {
            valid: false,
            error: `圖片驗證失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        };
    }
}

export async function optimizeImageForPdf(
    file: File
): Promise<{ blob: Blob; url: string }> {
    // 簡單的優化: 如果圖片過大，縮小到最大尺寸
    const img = new Image();
    const url = URL.createObjectURL(file);

    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
    });

    // 如果尺寸符合，直接返回
    if (img.width <= IMAGE_CONSTRAINTS.maxWidth && img.height <= IMAGE_CONSTRAINTS.maxHeight) {
        return { blob: file, url };
    }

    // 計算縮放比例
    const scale = Math.min(
        IMAGE_CONSTRAINTS.maxWidth / img.width,
        IMAGE_CONSTRAINTS.maxHeight / img.height
    );

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(img.width * scale);
    canvas.height = Math.floor(img.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('無法建立 canvas context');

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 轉換為 blob
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('無法轉換為 blob'));
        }, 'image/png', 0.9);
    });

    // 清理原始 URL
    URL.revokeObjectURL(url);

    // 建立新 URL
    const optimizedUrl = URL.createObjectURL(blob);

    return { blob, url: optimizedUrl };
}
```

**Step 2: 在上傳時驗證**

```typescript
// src/components/provider-form.tsx (範例)
import { validateImage, optimizeImageForPdf } from '@/lib/image-validator';

// 在圖片上傳處理中
const handleLogoUpload = async (file: File) => {
    // 驗證圖片
    const validation = await validateImage(file);

    if (!validation.valid) {
        toast.error(validation.error || '圖片驗證失敗');
        return;
    }

    if (validation.warnings) {
        validation.warnings.forEach(warning => toast.warning(warning));
    }

    // 優化圖片
    try {
        const { blob, url } = await optimizeImageForPdf(file);

        // 顯示預覽
        setLogoPreview(url);

        // 上傳到伺服器或儲存到本地
        // ... 上傳邏輯

    } catch (error) {
        toast.error('圖片優化失敗');
        console.error(error);
    }
};
```

**測試檢查清單**:
- [ ] 圖片大小驗證正常
- [ ] 圖片格式驗證正常
- [ ] 尺寸過大時自動縮小
- [ ] 驗證錯誤有友善提示

---

## Phase 2: 穩固基礎 (Week 2)

### 優化 4: 整合效能監控 (Day 1-3)

#### 實作步驟

**Step 1: 整合到下載按鈕**

```typescript
// src/components/invoice-download-button.tsx (加入效能監控)
import { PdfPerformanceMonitor, validatePerformance } from '@/lib/performance-metrics';

export function InvoiceDownloadButton({ invoice, fileName }: InvoiceDownloadButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
    const [cacheKey, setCacheKey] = useState<string>('');
    const [lastMetrics, setLastMetrics] = useState<PdfPerformanceMetrics | null>(null);

    const generateAndDownload = async () => {
        const monitor = new PdfPerformanceMonitor();

        try {
            setIsGenerating(true);
            monitor.start();

            // 記錄初始記憶體
            const initialMemory = monitor.getMemoryUsage();

            // 資料準備
            monitor.mark('data-prep-start');
            const currentKey = JSON.stringify({
                id: invoice.id,
                updatedAt: invoice.updatedAt,
            });
            monitor.mark('data-prep-end');
            monitor.measure('dataPreparationTime', 'data-prep-start', 'data-prep-end');

            let blob: Blob;

            // 檢查快取
            if (cachedBlob && cacheKey === currentKey) {
                console.log("✅ Cache hit!");
                blob = cachedBlob;
                monitor.setMetric('cacheHitRate', 1);
            } else {
                console.log("⚠️ Cache miss, generating...");
                monitor.setMetric('cacheHitRate', 0);

                // 生成 PDF
                monitor.mark('render-start');
                blob = await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
                monitor.mark('render-end');
                monitor.measure('renderTime', 'render-start', 'render-end');

                setCachedBlob(blob);
                setCacheKey(currentKey);
            }

            // 記錄 PDF 大小
            monitor.setMetric('pdfSize', blob.size);

            // 記錄項目數量
            const items = typeof invoice.items === 'string'
                ? JSON.parse(invoice.items)
                : invoice.items;
            monitor.setMetric('itemCount', items.length);

            // 記錄記憶體增長
            const finalMemory = monitor.getMemoryUsage();
            if (initialMemory && finalMemory) {
                monitor.setMetric('memoryUsed', finalMemory - initialMemory);
            }

            // 下載
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName || `invoice-${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);

            // 生成報告
            const metrics = monitor.report();
            setLastMetrics(metrics);

            // 驗證效能預算
            const validation = validatePerformance(metrics, items.length);
            if (!validation.passed) {
                console.warn('⚠️ Performance budget exceeded:');
                validation.violations.forEach(v => console.warn(`  - ${v}`));
            }
            if (validation.warnings.length > 0) {
                console.info('ℹ️ Performance warnings:');
                validation.warnings.forEach(w => console.info(`  - ${w}`));
            }

        } catch (error) {
            console.error("❌ PDF generation failed:", error);
            monitor.report();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={generateAndDownload}
                disabled={isGenerating}
            >
                {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
            </Button>

            {/* 開發環境顯示效能指標 */}
            {process.env.NODE_ENV === 'development' && lastMetrics && (
                <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                        生成時間: {lastMetrics.totalTime.toFixed(0)}ms
                        {lastMetrics.cacheHitRate === 1 && ' (cached)'}
                    </div>
                    {lastMetrics.renderTime && (
                        <div>渲染時間: {lastMetrics.renderTime.toFixed(0)}ms</div>
                    )}
                    {lastMetrics.pdfSize && (
                        <div>PDF 大小: {(lastMetrics.pdfSize / 1024).toFixed(2)}KB</div>
                    )}
                </div>
            )}
        </div>
    );
}
```

**測試檢查清單**:
- [ ] 效能指標正確記錄
- [ ] Console 輸出格式友善
- [ ] 開發環境顯示效能資訊
- [ ] 預算超限時有警告

---

## 驗證與測試

### 整體驗證流程

```bash
# 1. 執行基準測試
npm run bench

# 2. 測試不同大小的 PDF
# 在瀏覽器中測試:
# - 小型發票 (5 項目)
# - 中型發票 (20 項目)
# - 大型發票 (50 項目)

# 3. 記錄效能指標
# 查看瀏覽器 Console 的效能報告

# 4. 比較優化前後
# 將結果記錄到 spreadsheet 或文件中
```

### 效能對比表格模板

| 場景 | 優化前 | 優化後 | 提升幅度 |
|-----|-------|-------|---------|
| 小型發票 (5 項) | ?ms | ?ms | ?% |
| 中型發票 (20 項) | ?ms | ?ms | ?% |
| 大型發票 (50 項) | ?ms | ?ms | ?% |
| 快取命中 | - | ?ms | - |

---

## 常見問題與解決方案

### Q1: 字體子集化後某些字無法顯示

**解決方案**:
1. 分析缺失的字符
2. 擴大字體子集的 Unicode 範圍
3. 或提供完整字體作為備用

### Q2: PDF 生成仍然很慢

**檢查清單**:
- [ ] 字體檔案是否成功替換
- [ ] 是否有大量項目 (>50)
- [ ] 圖片是否過大
- [ ] 網路是否緩慢 (影響字體載入)

### Q3: 快取不生效

**檢查清單**:
- [ ] cacheKey 是否正確生成
- [ ] invoice.updatedAt 是否變化
- [ ] 組件是否重新掛載

---

**下一步**: Phase 2 (Web Worker) 和 Phase 3 (IndexedDB) 的實作指南將在後續文件中提供。
