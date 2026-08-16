# PDF Generation Performance Analysis & Optimization Plan

## Executive Summary

本報告針對專案中使用 `@react-pdf/renderer` 的 PDF 生成功能進行深入效能分析，識別瓶頸並提供優化方案。

**當前狀態**: 已完成 4 項基礎優化（預計算總額、字體註冊優化、PDF 快取、簡化結構）
**主要問題**: 尚有 5-7 個可優化點，預期可再提升 30-60% 效能

---

## 一、當前實作分析

### 1.1 架構概覽

```
┌─────────────────────────────────────┐
│  InvoiceDownloadButton              │
│  - 快取管理 (Blob caching)          │
│  - 生成協調 (Generation coordinator)│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  InvoicePdfDocument                 │
│  - React.memo 包裝                  │
│  - useMemo 預計算                   │
│  - 樣式定義 (StyleSheet)            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  @react-pdf/renderer                │
│  - 字體載入 (1.3MB + 1.4MB)         │
│  - PDF 渲染引擎                     │
└─────────────────────────────────────┘
```

### 1.2 已完成優化 ✅

| 優化項目 | 實作位置 | 預期效益 | 狀態 |
|---------|---------|---------|------|
| 預先計算總額 | `invoice-pdf.tsx` L198-238 | 10-15% | ✅ |
| 字體註冊優化 | `pdf-fonts.ts` 單例模式 | 20-30% | ✅ |
| PDF 快取機制 | `invoice-download-button.tsx` L111-126 | 50-90% (重複下載) | ✅ |
| 簡化 PDF 結構 | `invoice-pdf.tsx` 移除未使用樣式 | 5-10% | ✅ |

### 1.3 當前瓶頸識別

#### 🔴 **Critical 瓶頸 (高影響)**

1. **字體檔案過大** (2.7MB 總大小)
   - `noto-sans-tc-400.woff`: 1.36MB
   - `noto-sans-tc-700.woff`: 1.38MB
   - **影響**: 首次載入需下載完整字體檔案

2. **主執行緒阻塞**
   - PDF 生成在主執行緒執行
   - **影響**: 大型 PDF (>20 項目) 會凍結 UI 1-3 秒

3. **圖片處理未優化**
   - Logo 和印章直接使用原始檔案路徑
   - **影響**: 若圖片過大會顯著影響效能

#### 🟡 **Medium 瓶頸 (中等影響)**

4. **React 渲染效能**
   - `renderTable` 函數在每次渲染時重新創建
   - `map` 操作在 PDF 組件內部執行
   - **影響**: 不必要的函數重建和計算

5. **樣式物件未優化**
   - 內聯樣式組合（如 L367, L414）
   - **影響**: 微小但可累積的效能損失

#### 🟢 **Low 瓶頸 (低影響)**

6. **日期格式化**
   - 使用 `date-fns` 的 `format` 函數
   - **影響**: 極小，但可預計算

7. **JSON 解析**
   - `invoice.items` 可能為字串，需動態解析
   - **影響**: 若已是物件則造成額外檢查

---

## 二、效能優化方案

### 2.1 短期優化（1-2 天實作）

#### 🔥 優先級 1: 字體檔案優化

**問題**: 2.7MB 字體檔案過大

**方案 A: 字體子集化 (Font Subsetting)** ⭐⭐⭐⭐⭐ **推薦**

```bash
# 使用 fonttools 進行字體子集化
pip install fonttools brotli

# 只保留常用中文字（約 3000-5000 字）
pyftsubset noto-sans-tc-400.woff \
  --unicodes="U+4E00-9FFF,U+3000-303F,U+FF00-FFEF,U+0030-0039,U+0041-005A,U+0061-007A" \
  --output-file=noto-sans-tc-400-subset.woff \
  --flavor=woff

# 預期檔案大小: 300-500KB (減少 70-80%)
```

**優點**:
- 檔案大小減少 70-80%
- 載入速度提升 3-4 倍
- 不影響顯示品質（覆蓋常用字）

**缺點**:
- 需額外建置步驟
- 若需生僻字可能無法顯示

**預期效能提升**: 40-60% (首次載入)

---

**方案 B: 使用系統字體作為備用**

```typescript
// src/lib/pdf-fonts.ts
Font.register({
    family: 'Noto Sans TC',
    fonts: [
        {
            src: '/fonts/noto-sans-tc-400-subset.woff',  // 使用子集化版本
            fontWeight: 400,
        },
        {
            src: '/fonts/noto-sans-tc-700-subset.woff',
            fontWeight: 700,
        }
    ]
});

// 添加系統字體備用
Font.registerHyphenationCallback(word => [word]);
```

**預期效能提升**: 40-60% (首次載入)
**實作難度**: ⭐⭐ 中等
**優先級**: 🔥 極高

---

#### 🔥 優先級 2: React 組件優化

**問題**: `renderTable` 函數每次渲染重新創建

**方案: 使用 useCallback 快取渲染函數**

```typescript
// src/components/invoice-pdf.tsx (優化版)
export const InvoicePdfDocument = React.memo(({ invoice }: InvoicePdfProps) => {
    const {
        serviceItems,
        reimbursementItems,
        // ... 其他預計算值
    } = React.useMemo(() => {
        // ... 現有邏輯
    }, [invoice]);

    // 🆕 使用 useCallback 快取渲染函數
    const renderTableRow = React.useCallback((item: InvoiceItem, index: number) => (
        <TableRow key={index} item={item} />
    ), []);

    const renderTable = React.useCallback((
        tableItems: InvoiceItem[],
        title: string,
        defaultCategory: string
    ) => {
        if (tableItems.length === 0) return null;

        return (
            <View style={styles.table}>
                <TableHeader title={title} />
                {tableItems.map(renderTableRow)}
            </View>
        );
    }, [renderTableRow]);

    // ... 其餘邏輯
});
```

**更好的方案: 拆分子組件**

```typescript
// src/components/pdf/InvoiceTableRow.tsx
const InvoiceTableRow = React.memo(({ item }: { item: InvoiceItem }) => (
    <View style={styles.tableRow}>
        <Text style={[styles.tableCell, styles.colCategory]}>
            {item.category || "服務項目"}
        </Text>
        <Text style={[styles.tableCell, styles.colName]}>{item.name}</Text>
        <Text style={[styles.tableCell, styles.colContent]}>
            {item.content || item.description || ""}
        </Text>
        {/* ... 其他欄位 */}
    </View>
));

// src/components/pdf/InvoiceTable.tsx
const InvoiceTable = React.memo(({
    items,
    title,
    defaultCategory
}: InvoiceTableProps) => {
    if (items.length === 0) return null;

    return (
        <View style={styles.table}>
            <InvoiceTableHeader title={title} />
            {items.map((item, idx) => (
                <InvoiceTableRow key={idx} item={item} />
            ))}
        </View>
    );
});
```

**預期效能提升**: 15-25%
**實作難度**: ⭐⭐ 中等
**優先級**: 🔥 高

---

#### 🔥 優先級 3: 圖片優化

**問題**: Logo 和印章可能過大

**方案: 圖片預處理與驗證**

```typescript
// src/lib/image-optimizer.ts
export async function optimizeImageForPdf(
    imagePath: string,
    maxWidth: number = 400,
    maxHeight: number = 400
): Promise<string> {
    // 若已經是 data URI，直接返回
    if (imagePath.startsWith('data:')) return imagePath;

    // 在伺服器端預處理圖片
    const response = await fetch(imagePath);
    const blob = await response.blob();

    // 檢查檔案大小
    if (blob.size > 500000) { // 500KB
        console.warn(`Image ${imagePath} is too large (${blob.size} bytes)`);
        // 可在此處進行壓縮或調整大小
    }

    return imagePath;
}

// 在 Server Action 中預處理
// src/app/actions/invoice.ts
export async function createInvoice(data: CreateInvoiceInput) {
    const provider = await prisma.provider.findUnique({
        where: { id: data.providerId },
    });

    // 🆕 預處理圖片
    if (provider?.logoPath) {
        provider.logoPath = await optimizeImageForPdf(provider.logoPath);
    }
    if (provider?.stampPath) {
        provider.stampPath = await optimizeImageForPdf(provider.stampPath);
    }

    // ... 其餘邏輯
}
```

**配置建議**:
- Logo 最大尺寸: 400x300px
- 印章最大尺寸: 300x300px
- 檔案大小限制: 200KB
- 格式: PNG 或 WEBP

**預期效能提升**: 10-30% (取決於原始圖片大小)
**實作難度**: ⭐⭐⭐ 中高
**優先級**: 🟡 中

---

### 2.2 中期優化（3-5 天實作）

#### 🔥 優先級 4: Web Worker 背景生成

**問題**: PDF 生成阻塞主執行緒

**方案: 使用 Web Worker 異步生成**

```typescript
// src/workers/pdf-generator.worker.ts
import { pdf } from '@react-pdf/renderer';
import { InvoicePdfDocument } from '@/components/invoice-pdf';

self.addEventListener('message', async (e) => {
    const { invoice, requestId } = e.data;

    try {
        // 在 Worker 中生成 PDF
        const blob = await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();

        // 傳回主執行緒
        self.postMessage({
            requestId,
            success: true,
            blob,
        });
    } catch (error) {
        self.postMessage({
            requestId,
            success: false,
            error: error.message,
        });
    }
});

// src/hooks/use-pdf-generator.ts
import { useCallback, useState } from 'react';

export function usePdfGenerator() {
    const [worker, setWorker] = useState<Worker | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const initWorker = useCallback(() => {
        if (!worker) {
            const newWorker = new Worker(
                new URL('../workers/pdf-generator.worker.ts', import.meta.url)
            );
            setWorker(newWorker);
        }
    }, [worker]);

    const generatePdf = useCallback((invoice: any): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            if (!worker) {
                reject(new Error('Worker not initialized'));
                return;
            }

            const requestId = Math.random().toString(36);

            const handleMessage = (e: MessageEvent) => {
                if (e.data.requestId !== requestId) return;

                worker.removeEventListener('message', handleMessage);
                setIsGenerating(false);

                if (e.data.success) {
                    resolve(e.data.blob);
                } else {
                    reject(new Error(e.data.error));
                }
            };

            worker.addEventListener('message', handleMessage);
            setIsGenerating(true);
            worker.postMessage({ invoice, requestId });
        });
    }, [worker]);

    return { initWorker, generatePdf, isGenerating };
}

// src/components/invoice-download-button.tsx (使用 Worker)
export function InvoiceDownloadButton({ invoice }: InvoiceDownloadButtonProps) {
    const { initWorker, generatePdf, isGenerating } = usePdfGenerator();

    useEffect(() => {
        initWorker();
    }, [initWorker]);

    const handleDownload = async () => {
        try {
            const blob = await generatePdf(invoice);
            // ... 下載邏輯
        } catch (error) {
            console.error('PDF generation failed:', error);
        }
    };

    // ... 其餘邏輯
}
```

**挑戰與解決方案**:

1. **@react-pdf/renderer 在 Worker 中的相容性**
   - 問題: 可能需要額外配置
   - 解決: 使用 `workerize-loader` 或手動配置 webpack

2. **字體在 Worker 中載入**
   - 問題: Worker 無法訪問 DOM
   - 解決: 預先轉換字體為 base64 或使用絕對 URL

**預期效能提升**: 30-50% (感知速度)
**實作難度**: ⭐⭐⭐⭐ 複雜
**優先級**: 🟡 中 (長期價值高)

---

#### 🔥 優先級 5: 快取策略增強

**問題**: 當前快取只在組件生命週期內有效

**方案: 使用 IndexedDB 持久化快取**

```typescript
// src/lib/pdf-cache.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PdfCacheDB extends DBSchema {
    pdfs: {
        key: string;
        value: {
            blob: Blob;
            timestamp: number;
            invoiceId: string;
            version: string;
        };
    };
}

class PdfCache {
    private db: IDBPDatabase<PdfCacheDB> | null = null;
    private readonly DB_NAME = 'pdf-cache';
    private readonly STORE_NAME = 'pdfs';
    private readonly MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 天

    async init() {
        if (this.db) return;

        this.db = await openDB<PdfCacheDB>(this.DB_NAME, 1, {
            upgrade(db) {
                db.createObjectStore('pdfs');
            },
        });
    }

    async get(cacheKey: string): Promise<Blob | null> {
        await this.init();
        if (!this.db) return null;

        const cached = await this.db.get(this.STORE_NAME, cacheKey);
        if (!cached) return null;

        // 檢查是否過期
        if (Date.now() - cached.timestamp > this.MAX_AGE) {
            await this.delete(cacheKey);
            return null;
        }

        return cached.blob;
    }

    async set(cacheKey: string, blob: Blob, invoiceId: string, version: string) {
        await this.init();
        if (!this.db) return;

        await this.db.put(this.STORE_NAME, {
            blob,
            timestamp: Date.now(),
            invoiceId,
            version,
        }, cacheKey);
    }

    async delete(cacheKey: string) {
        await this.init();
        if (!this.db) return;
        await this.db.delete(this.STORE_NAME, cacheKey);
    }

    async clear() {
        await this.init();
        if (!this.db) return;
        await this.db.clear(this.STORE_NAME);
    }
}

export const pdfCache = new PdfCache();

// 在 InvoiceDownloadButton 中使用
const generateAndDownload = async () => {
    try {
        setIsGenerating(true);

        const currentKey = JSON.stringify({
            id: invoice.id,
            updatedAt: invoice.updatedAt,
        });

        // 🆕 嘗試從 IndexedDB 獲取
        let blob = await pdfCache.get(currentKey);

        if (!blob) {
            console.log("Generating new PDF blob");
            blob = await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();

            // 🆕 儲存到 IndexedDB
            await pdfCache.set(currentKey, blob, invoice.id, invoice.updatedAt);
        } else {
            console.log("Using cached PDF blob from IndexedDB");
        }

        // ... 下載邏輯
    } catch (error) {
        console.error("Error:", error);
    } finally {
        setIsGenerating(false);
    }
};
```

**預期效能提升**: 90-99% (跨 session 快取)
**實作難度**: ⭐⭐⭐ 中高
**優先級**: 🟡 中

---

### 2.3 長期優化（1-2 週實作）

#### 🔥 優先級 6: 批次生成與預載

**問題**: 一次只能生成一張 PDF

**方案: 批次生成與智慧預載**

```typescript
// src/lib/pdf-batch-generator.ts
export class PdfBatchGenerator {
    private queue: Array<{
        invoice: any;
        priority: number;
        resolve: (blob: Blob) => void;
        reject: (error: Error) => void;
    }> = [];

    private isProcessing = false;
    private readonly MAX_CONCURRENT = 2;

    async generate(invoice: any, priority: number = 0): Promise<Blob> {
        return new Promise((resolve, reject) => {
            this.queue.push({ invoice, priority, resolve, reject });
            this.queue.sort((a, b) => b.priority - a.priority);
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        const batch = this.queue.splice(0, this.MAX_CONCURRENT);

        await Promise.all(
            batch.map(async ({ invoice, resolve, reject }) => {
                try {
                    const blob = await pdf(
                        <InvoicePdfDocument invoice={invoice} />
                    ).toBlob();
                    resolve(blob);
                } catch (error) {
                    reject(error as Error);
                }
            })
        );

        this.isProcessing = false;

        if (this.queue.length > 0) {
            this.processQueue();
        }
    }
}

// src/hooks/use-pdf-preloader.ts
export function usePdfPreloader(invoices: any[]) {
    const generator = useRef(new PdfBatchGenerator());

    useEffect(() => {
        // 預載前 5 張發票的 PDF
        const preloadInvoices = invoices.slice(0, 5);

        preloadInvoices.forEach((invoice, index) => {
            generator.current.generate(invoice, -index); // 負優先級表示預載
        });
    }, [invoices]);

    return generator.current;
}
```

**預期效能提升**: 40-70% (感知速度，清單場景)
**實作難度**: ⭐⭐⭐⭐ 複雜
**優先級**: 🟢 低 (適合清單頁面)

---

#### 🔥 優先級 7: 伺服器端生成

**問題**: 客戶端生成消耗使用者資源

**方案: 使用 Server Action 生成 PDF**

```typescript
// src/app/actions/pdf.ts
'use server';

import { renderToStream } from '@react-pdf/renderer';
import { InvoicePdfDocument } from '@/components/invoice-pdf';
import { prisma } from '@/lib/prisma';

export async function generateInvoicePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            company: true,
            provider: {
                include: { bankAccounts: true }
            }
        }
    });

    if (!invoice) throw new Error('Invoice not found');

    // 在伺服器端生成 PDF
    const stream = await renderToStream(<InvoicePdfDocument invoice={invoice} />);

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

// API Route
// src/app/api/invoices/[id]/pdf/route.ts
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const pdfBuffer = await generateInvoicePdf(params.id);

        return new Response(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${params.id}.pdf"`,
                'Cache-Control': 'public, max-age=3600', // 快取 1 小時
            },
        });
    } catch (error) {
        return new Response('Error generating PDF', { status: 500 });
    }
}

// 客戶端使用
export function InvoiceDownloadButton({ invoice }: InvoiceDownloadButtonProps) {
    const handleDownload = async () => {
        setIsGenerating(true);

        try {
            const response = await fetch(`/api/invoices/${invoice.id}/pdf`);
            const blob = await response.blob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `invoice-${invoice.invoiceNumber}.pdf`;
            link.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // ... 其餘邏輯
}
```

**優點**:
- 不消耗客戶端資源
- 可利用伺服器快取
- 更容易實作批次生成
- 可使用 CDN 加速

**缺點**:
- 增加伺服器負載
- 需要網路連線

**預期效能提升**: 20-40% (取決於伺服器效能)
**實作難度**: ⭐⭐⭐ 中高
**優先級**: 🟢 低 (適合生產環境)

---

## 三、效能測試方案

### 3.1 測試指標定義

```typescript
// src/lib/performance-metrics.ts
export interface PdfPerformanceMetrics {
    // 時間指標
    fontLoadTime: number;        // 字體載入時間
    dataPreparationTime: number; // 資料準備時間
    renderTime: number;          // 渲染時間
    blobGenerationTime: number;  // Blob 生成時間
    totalTime: number;           // 總時間

    // 資源指標
    pdfSize: number;             // PDF 檔案大小
    memoryUsed: number;          // 記憶體使用量

    // 品質指標
    cacheHitRate: number;        // 快取命中率
    itemCount: number;           // 項目數量
}

export class PdfPerformanceMonitor {
    private metrics: Partial<PdfPerformanceMetrics> = {};
    private startTime: number = 0;
    private marks: Map<string, number> = new Map();

    start() {
        this.startTime = performance.now();
        this.marks.clear();

        // 使用 Performance API
        performance.mark('pdf-generation-start');
    }

    mark(name: string) {
        const time = performance.now();
        this.marks.set(name, time);
        performance.mark(`pdf-${name}`);
    }

    measure(name: string, startMark: string, endMark: string) {
        const start = this.marks.get(startMark) || this.startTime;
        const end = this.marks.get(endMark) || performance.now();
        const duration = end - start;

        this.metrics[name as keyof PdfPerformanceMetrics] = duration;

        performance.measure(
            `pdf-${name}`,
            `pdf-${startMark}`,
            `pdf-${endMark}`
        );

        return duration;
    }

    end(): PdfPerformanceMetrics {
        const totalTime = performance.now() - this.startTime;
        performance.mark('pdf-generation-end');

        performance.measure(
            'pdf-total-time',
            'pdf-generation-start',
            'pdf-generation-end'
        );

        return {
            ...this.metrics,
            totalTime,
        } as PdfPerformanceMetrics;
    }

    report() {
        const metrics = this.end();

        console.group('📊 PDF Generation Performance Report');
        console.table(metrics);
        console.groupEnd();

        // 可選: 傳送到分析服務
        this.sendToAnalytics(metrics);

        return metrics;
    }

    private sendToAnalytics(metrics: PdfPerformanceMetrics) {
        // 整合到現有的監控系統
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'pdf_generation', {
                event_category: 'performance',
                total_time: metrics.totalTime,
                pdf_size: metrics.pdfSize,
                item_count: metrics.itemCount,
            });
        }
    }
}
```

### 3.2 整合測試到組件

```typescript
// src/components/invoice-download-button.tsx (帶效能監控)
export function InvoiceDownloadButton({ invoice }: InvoiceDownloadButtonProps) {
    const [metrics, setMetrics] = useState<PdfPerformanceMetrics | null>(null);

    const generateAndDownload = async () => {
        const monitor = new PdfPerformanceMonitor();

        try {
            setIsGenerating(true);
            monitor.start();

            // 1. 資料準備
            monitor.mark('data-prep-start');
            const currentKey = JSON.stringify({
                id: invoice.id,
                updatedAt: invoice.updatedAt,
            });
            monitor.mark('data-prep-end');
            monitor.measure('dataPreparationTime', 'data-prep-start', 'data-prep-end');

            let blob: Blob;

            // 2. 檢查快取
            if (cachedBlob && cacheKey === currentKey) {
                console.log("Cache hit!");
                blob = cachedBlob;
                monitor.metrics.cacheHitRate = 1;
            } else {
                console.log("Cache miss, generating...");
                monitor.metrics.cacheHitRate = 0;

                // 3. 渲染 PDF
                monitor.mark('render-start');
                blob = await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
                monitor.mark('render-end');
                monitor.measure('renderTime', 'render-start', 'render-end');

                setCachedBlob(blob);
                setCacheKey(currentKey);
            }

            // 4. 記錄 PDF 大小
            monitor.metrics.pdfSize = blob.size;

            // 5. 下載
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName || `invoice-${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);

            // 6. 報告效能
            const finalMetrics = monitor.report();
            setMetrics(finalMetrics);

        } catch (error) {
            console.error("Error generating PDF:", error);
            monitor.report(); // 即使失敗也報告
        } finally {
            setIsGenerating(false);
        }
    };

    // ... 其餘邏輯
}
```

### 3.3 Vitest 基準測試

```typescript
// benchmarks/pdf-generation.bench.ts
import { bench, describe } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import { InvoicePdfDocument } from '@/components/invoice-pdf';

// 模擬資料
const createMockInvoice = (itemCount: number) => ({
    id: '1',
    invoiceNumber: 'INV-001',
    date: new Date(),
    totalAmount: 10000,
    taxAmount: 500,
    updatedAt: new Date(),
    company: {
        name: 'Test Company',
        taxId: '12345678',
    },
    provider: {
        name: 'Provider',
        taxId: '87654321',
    },
    items: Array(itemCount).fill(null).map((_, i) => ({
        type: 'service',
        name: `Item ${i + 1}`,
        content: 'Test content',
        quantity: 1,
        price: 1000,
        amount: 1000,
    })),
});

describe('PDF Generation Performance', () => {
    bench('generate PDF with 5 items', async () => {
        const invoice = createMockInvoice(5);
        await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
    });

    bench('generate PDF with 20 items', async () => {
        const invoice = createMockInvoice(20);
        await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
    });

    bench('generate PDF with 50 items', async () => {
        const invoice = createMockInvoice(50);
        await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
    });

    bench('generate PDF with 100 items', async () => {
        const invoice = createMockInvoice(100);
        await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
    });
});

// 執行: npm run bench
```

### 3.4 效能預算 (Performance Budget)

```typescript
// vitest.config.ts
export default defineConfig({
    test: {
        benchmark: {
            // 設定效能預算
            include: ['benchmarks/**/*.bench.ts'],
            reporters: ['verbose'],
            outputFile: './benchmark-results.json',
        },
    },
});

// benchmarks/performance-budget.ts
export const PERFORMANCE_BUDGETS = {
    // 時間預算（毫秒）
    fontLoadTime: 100,              // 字體載入 < 100ms
    dataPreparationTime: 50,        // 資料準備 < 50ms
    renderTime: {
        small: 500,   // 5 項目以下 < 500ms
        medium: 1000, // 5-20 項目 < 1s
        large: 2000,  // 20-50 項目 < 2s
        xlarge: 3000, // 50+ 項目 < 3s
    },
    totalTime: {
        small: 800,
        medium: 1500,
        large: 3000,
        xlarge: 5000,
    },

    // 資源預算
    maxPdfSize: 2 * 1024 * 1024,    // 2MB
    maxMemoryIncrease: 50 * 1024 * 1024, // 50MB

    // 品質預算
    minCacheHitRate: 0.6,           // 快取命中率 > 60%
};

// 驗證函數
export function validatePerformance(
    metrics: PdfPerformanceMetrics,
    itemCount: number
): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    const sizeCategory =
        itemCount <= 5 ? 'small' :
        itemCount <= 20 ? 'medium' :
        itemCount <= 50 ? 'large' : 'xlarge';

    if (metrics.totalTime > PERFORMANCE_BUDGETS.totalTime[sizeCategory]) {
        violations.push(
            `Total time ${metrics.totalTime}ms exceeds budget ` +
            `${PERFORMANCE_BUDGETS.totalTime[sizeCategory]}ms`
        );
    }

    if (metrics.pdfSize > PERFORMANCE_BUDGETS.maxPdfSize) {
        violations.push(
            `PDF size ${metrics.pdfSize} bytes exceeds budget ` +
            `${PERFORMANCE_BUDGETS.maxPdfSize} bytes`
        );
    }

    return {
        passed: violations.length === 0,
        violations,
    };
}
```

---

## 四、實作優先級與時程

### 4.1 優先級矩陣

```
                    高影響 ───────────────────► 低影響
                    │
                    │  1. 字體子集化      5. 快取增強
簡單實作             │     (2-3 天)           (3-4 天)
                    │
                    │  2. React 優化      6. 批次生成
中等實作             │     (1-2 天)           (4-5 天)
                    │
                    │  4. Web Worker      7. 伺服器端生成
複雜實作             │     (4-5 天)           (5-7 天)
                    │
                    │  3. 圖片優化
                    ▼     (2-3 天)
```

### 4.2 實作時程建議

#### Phase 1: 快速勝利（Week 1）

**目標**: 立即可見的效能提升

- [ ] Day 1-2: 字體子集化 (優先級 1)
- [ ] Day 3-4: React 組件優化 (優先級 2)
- [ ] Day 5: 圖片優化基礎 (優先級 3)

**預期成果**: 50-70% 效能提升

#### Phase 2: 穩固基礎（Week 2）

**目標**: 提升使用者體驗

- [ ] Day 1-3: Web Worker 實作 (優先級 4)
- [ ] Day 4-5: 效能測試整合

**預期成果**: 額外 20-30% 感知速度提升

#### Phase 3: 優化完善（Week 3-4）

**目標**: 長期可維護性

- [ ] Week 3: IndexedDB 快取 (優先級 5)
- [ ] Week 4: 批次生成與預載 (優先級 6)

**預期成果**: 完整的效能優化系統

#### Phase 4: 選用增強（Month 2+）

**目標**: 生產環境優化

- [ ] 伺服器端生成 (優先級 7)
- [ ] CDN 整合
- [ ] 進階監控與分析

---

## 五、程式碼範例（完整實作）

### 5.1 優化後的 PDF 組件

```typescript
// src/components/invoice-pdf-optimized.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { registerPdfFonts } from '@/lib/pdf-fonts';

registerPdfFonts();

// 🆕 抽取樣式到模組層級（避免重複創建）
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Noto Sans TC',
        padding: 30,
        fontSize: 10,
    },
    // ... 其他樣式（與原本相同）
});

// 🆕 拆分子組件
const InvoiceTableRow = React.memo(({
    item,
    defaultCategory
}: {
    item: InvoiceItem;
    defaultCategory: string;
}) => (
    <View style={styles.tableRow}>
        <Text style={[styles.tableCell, styles.colCategory]}>
            {item.category || defaultCategory}
        </Text>
        <Text style={[styles.tableCell, styles.colName]}>{item.name}</Text>
        <Text style={[styles.tableCell, styles.colContent]}>
            {item.content || item.description || ""}
        </Text>
        <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
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

const InvoiceTableHeader = React.memo(({ title }: { title: string }) => (
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

const InvoiceTable = React.memo(({
    items,
    title,
    defaultCategory
}: {
    items: InvoiceItem[];
    title: string;
    defaultCategory: string;
}) => {
    if (items.length === 0) return null;

    return (
        <View style={styles.table}>
            <InvoiceTableHeader title={title} />
            {items.map((item, index) => (
                <InvoiceTableRow
                    key={index}
                    item={item}
                    defaultCategory={defaultCategory}
                />
            ))}
        </View>
    );
});

export const InvoicePdfDocument = React.memo(({ invoice }: InvoicePdfProps) => {
    // 🆕 預計算所有需要的資料
    const computedData = React.useMemo(() => {
        const items = typeof invoice.items === 'string'
            ? JSON.parse(invoice.items)
            : invoice.items;

        const company = invoice.company;
        const provider = invoice.provider || DEFAULT_PROVIDER;

        // 分類項目
        const serviceItems = items.filter(
            (item: InvoiceItem) => !item.type || item.type === 'service'
        );
        const reimbursementItems = items.filter(
            (item: InvoiceItem) => item.type === 'reimbursement'
        );

        // 計算總額
        const serviceSubtotal = serviceItems.reduce(
            (sum: number, item: InvoiceItem) => sum + item.amount,
            0
        );
        const serviceTax = Math.round(
            serviceSubtotal * (invoice.taxAmount > 0 ? 0.05 : 0)
        );
        const serviceTotal = serviceSubtotal + serviceTax;
        const reimbursementTotal = reimbursementItems.reduce(
            (sum: number, item: InvoiceItem) => sum + item.amount,
            0
        );
        const grandTotal = serviceTotal + reimbursementTotal;

        // 🆕 預格式化日期
        const formattedDate = format(new Date(invoice.date), 'yyyy/MM/dd');

        return {
            items,
            serviceItems,
            reimbursementItems,
            serviceSubtotal,
            serviceTax,
            serviceTotal,
            reimbursementTotal,
            grandTotal,
            provider,
            company,
            formattedDate,
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

                {/* 🆕 使用拆分的組件 */}
                <InvoiceTable
                    items={computedData.serviceItems}
                    title="服務項目"
                    defaultCategory="服務項目"
                />

                {/* Service Totals */}
                {computedData.serviceItems.length > 0 && (
                    <View style={styles.totals}>
                        <View style={styles.totalRow}>
                            <Text>銷售金額 (未稅)：</Text>
                            <Text>${computedData.serviceSubtotal.toLocaleString()}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text>營業稅 (5%)：</Text>
                            <Text>${computedData.serviceTax.toLocaleString()}</Text>
                        </View>
                        <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 4 }]}>
                            <Text style={{ fontWeight: 'bold' }}>服務總計 (含稅)：</Text>
                            <Text style={{ fontWeight: 'bold' }}>
                                ${computedData.serviceTotal.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                )}

                {/* 🆕 使用拆分的組件 */}
                <InvoiceTable
                    items={computedData.reimbursementItems}
                    title="代墊費用"
                    defaultCategory="代墊費用"
                />

                {/* Grand Total */}
                <View style={[styles.totals, { marginTop: 20 }]}>
                    <View style={[styles.totalRow, { borderTopWidth: 2, borderTopColor: '#000', paddingTop: 4 }]}>
                        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>總計金額：</Text>
                        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>
                            ${computedData.grandTotal.toLocaleString()}
                        </Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
});
```

### 5.2 優化後的下載按鈕（含效能監控）

```typescript
// src/components/invoice-download-button-optimized.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { InvoicePdfDocument } from "@/components/invoice-pdf-optimized";
import { pdf } from "@react-pdf/renderer";
import { PdfPerformanceMonitor } from "@/lib/performance-metrics";
import { pdfCache } from "@/lib/pdf-cache";

export function InvoiceDownloadButton({ invoice, fileName }: InvoiceDownloadButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastMetrics, setLastMetrics] = useState<PdfPerformanceMetrics | null>(null);

    const generateAndDownload = async () => {
        const monitor = new PdfPerformanceMonitor();

        try {
            setIsGenerating(true);
            monitor.start();

            // 生成快取鍵
            const cacheKey = JSON.stringify({
                id: invoice.id,
                updatedAt: invoice.updatedAt,
            });

            let blob: Blob | null = null;

            // 🆕 嘗試從 IndexedDB 獲取
            blob = await pdfCache.get(cacheKey);

            if (blob) {
                console.log("✅ Cache hit from IndexedDB");
                monitor.metrics.cacheHitRate = 1;
            } else {
                console.log("⚠️ Cache miss, generating new PDF");
                monitor.mark('render-start');

                blob = await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();

                monitor.mark('render-end');
                monitor.measure('renderTime', 'render-start', 'render-end');
                monitor.metrics.cacheHitRate = 0;

                // 🆕 儲存到 IndexedDB
                await pdfCache.set(
                    cacheKey,
                    blob,
                    invoice.id,
                    invoice.updatedAt
                );
            }

            // 記錄 PDF 大小
            monitor.metrics.pdfSize = blob.size;
            monitor.metrics.itemCount = invoice.items?.length || 0;

            // 下載
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName || `invoice-${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);

            // 🆕 報告效能
            const metrics = monitor.report();
            setLastMetrics(metrics);

            // 🆕 驗證效能預算
            const validation = validatePerformance(metrics, invoice.items?.length || 0);
            if (!validation.passed) {
                console.warn('⚠️ Performance budget exceeded:', validation.violations);
            }

        } catch (error) {
            console.error("❌ PDF generation failed:", error);
            monitor.report();
            alert("PDF 生成失敗，請稍後再試");
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
                <span className="sr-only">下載 PDF</span>
            </Button>

            {/* 🆕 開發環境顯示效能指標 */}
            {process.env.NODE_ENV === 'development' && lastMetrics && (
                <span className="text-xs text-muted-foreground">
                    {lastMetrics.totalTime.toFixed(0)}ms
                    {lastMetrics.cacheHitRate === 1 && ' (cached)'}
                </span>
            )}
        </div>
    );
}
```

---

## 六、成功指標與驗收標準

### 6.1 效能目標

| 場景 | 項目數 | 當前 (估計) | 目標 | Phase 1 | Phase 2 | Phase 3 |
|-----|-------|-----------|------|---------|---------|---------|
| 小型發票 | 1-5 | 1200ms | 600ms | 800ms | 650ms | 600ms |
| 中型發票 | 5-20 | 2000ms | 1000ms | 1400ms | 1100ms | 1000ms |
| 大型發票 | 20-50 | 3500ms | 2000ms | 2500ms | 2200ms | 2000ms |
| 超大發票 | 50+ | 5000ms+ | 3000ms | 4000ms | 3500ms | 3000ms |
| 快取命中 | - | - | <100ms | - | <100ms | <50ms |

### 6.2 驗收檢查清單

#### Phase 1 完成標準
- [ ] 字體檔案大小 < 500KB (每個)
- [ ] 小型發票生成時間 < 800ms
- [ ] 中型發票生成時間 < 1400ms
- [ ] Logo 檔案大小 < 200KB
- [ ] 所有效能測試通過

#### Phase 2 完成標準
- [ ] Web Worker 成功運行
- [ ] UI 在生成時不凍結
- [ ] 快取命中率 > 60%
- [ ] 效能監控儀表板可用

#### Phase 3 完成標準
- [ ] IndexedDB 快取正常運作
- [ ] 跨 session 快取有效
- [ ] 批次生成功能正常
- [ ] 所有目標達成

---

## 七、風險與挑戰

### 7.1 技術風險

| 風險 | 影響 | 機率 | 緩解策略 |
|-----|------|------|---------|
| Web Worker 相容性 | 高 | 中 | 降級到主執行緒 |
| 字體子集化遺漏字元 | 中 | 低 | 提供完整字體備用 |
| IndexedDB 儲存限制 | 中 | 中 | 實作 LRU 清理策略 |
| 圖片處理效能損失 | 低 | 低 | 調整壓縮參數 |

### 7.2 實作挑戰

1. **字體子集化工具鏈**
   - 挑戰: 需要額外的建置步驟
   - 解決: 整合到 npm scripts

2. **Web Worker 與 React 整合**
   - 挑戰: @react-pdf/renderer 可能不完全支援
   - 解決: 先進行 POC 驗證

3. **快取失效策略**
   - 挑戰: 判斷何時清除快取
   - 解決: 使用 invoice.updatedAt 作為版本標記

---

## 八、總結與建議

### 8.1 立即行動項目

1. **本週執行**:
   - ✅ 閱讀本報告
   - ⬜ 執行字體子集化 (優先級 1)
   - ⬜ 實作 React 組件優化 (優先級 2)
   - ⬜ 整合效能監控工具

2. **下週規劃**:
   - ⬜ POC: Web Worker 可行性測試
   - ⬜ 實作 IndexedDB 快取
   - ⬜ 建立效能基準測試

### 8.2 長期建議

1. **持續優化**:
   - 每季度檢視效能指標
   - 根據使用者反饋調整優先級
   - 追蹤新的優化技術

2. **監控與警報**:
   - 整合到現有監控系統 (Metrics API)
   - 設定效能降級警報
   - 定期生成效能報告

3. **技術債務管理**:
   - 避免過度優化
   - 平衡效能與可維護性
   - 文件化所有優化決策

---

## 九、參考資源

### 9.1 官方文件
- [@react-pdf/renderer 文件](https://react-pdf.org/)
- [Font Subsetting Guide](https://github.com/fonttools/fonttools)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

### 9.2 相關文章
- [Optimizing PDF Generation Performance](https://blog.pdf-lib.js.org/performance)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Font Optimization Best Practices](https://web.dev/font-best-practices/)

### 9.3 工具
- [fonttools (Python)](https://github.com/fonttools/fonttools)
- [glyphhanger](https://github.com/zachleat/glyphhanger)
- [Chrome DevTools Performance Panel](https://developer.chrome.com/docs/devtools/performance/)

---

**文件版本**: 1.0
**建立日期**: 2025-12-03
**作者**: Claude Code Performance Analysis
**審查狀態**: Pending Review

**下一步**: 請 security-auditor、code-reviewer 審查本報告，並提供安全性與程式碼品質建議。
