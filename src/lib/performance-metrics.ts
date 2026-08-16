/**
 * PDF Generation Performance Monitoring
 *
 * 提供 PDF 生成過程的效能監控工具，追蹤關鍵指標並提供分析報告
 */

/** Google Analytics 4 的 gtag，只在載入了 GA 的頁面上存在 */
type GtagWindow = Window & {
    gtag?: (command: string, eventName: string, params: Record<string, unknown>) => void;
};

/** performance.memory 是 Chromium 專屬的非標準 API */
type PerformanceWithMemory = Performance & {
    memory?: { usedJSHeapSize: number };
};

export interface PdfPerformanceMetrics {
    // 時間指標 (毫秒)
    fontLoadTime?: number;        // 字體載入時間
    dataPreparationTime?: number; // 資料準備時間
    renderTime?: number;          // 渲染時間
    blobGenerationTime?: number;  // Blob 生成時間
    totalTime: number;            // 總時間

    // 資源指標
    pdfSize?: number;             // PDF 檔案大小 (bytes)
    memoryUsed?: number;          // 記憶體使用量 (bytes)

    // 品質指標
    cacheHitRate?: number;        // 快取命中率 (0-1)
    itemCount?: number;           // 項目數量
}

export class PdfPerformanceMonitor {
    private metrics: Partial<PdfPerformanceMetrics> = {};
    private startTime: number = 0;
    private marks: Map<string, number> = new Map();
    public cacheHit: boolean = false;

    /**
     * 開始監控
     */
    start() {
        this.startTime = performance.now();
        this.marks.clear();
        this.metrics = {};

        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark('pdf-generation-start');
        }
    }

    /**
     * 設定時間標記
     */
    mark(name: string) {
        const time = performance.now();
        this.marks.set(name, time);

        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark(`pdf-${name}`);
        }
    }

    /**
     * 測量兩個標記之間的時間
     */
    measure(metricName: string, startMark: string, endMark?: string): number {
        const start = this.marks.get(startMark) || this.startTime;
        const end = endMark ? (this.marks.get(endMark) || performance.now()) : performance.now();
        const duration = end - start;

        // 儲存到 metrics
        (this.metrics as Record<string, unknown>)[metricName] = duration;

        if (typeof performance !== 'undefined' && performance.measure) {
            try {
                performance.measure(
                    `pdf-${metricName}`,
                    `pdf-${startMark}`,
                    endMark ? `pdf-${endMark}` : undefined
                );
            } catch (error) {
                // Performance API 在某些環境可能不完全支援
                console.debug('Performance.measure not available:', error);
            }
        }

        return duration;
    }

    /**
     * 設定自訂指標
     */
    setMetric<K extends keyof PdfPerformanceMetrics>(
        name: K,
        value: PdfPerformanceMetrics[K]
    ) {
        this.metrics[name] = value;
    }

    /**
     * 結束監控並返回指標
     */
    end(): PdfPerformanceMetrics {
        const totalTime = performance.now() - this.startTime;

        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark('pdf-generation-end');
        }

        if (typeof performance !== 'undefined' && performance.measure) {
            try {
                performance.measure(
                    'pdf-total-time',
                    'pdf-generation-start',
                    'pdf-generation-end'
                );
            } catch (error) {
                console.debug('Performance.measure not available:', error);
            }
        }

        return {
            ...this.metrics,
            totalTime,
        } as PdfPerformanceMetrics;
    }

    /**
     * 生成並記錄效能報告
     */
    report(): PdfPerformanceMetrics {
        const metrics = this.end();

        console.group('📊 PDF Generation Performance Report');
        console.table(metrics);
        console.groupEnd();

        // 可選: 傳送到分析服務
        this.sendToAnalytics(metrics);

        return metrics;
    }

    /**
     * 傳送指標到分析服務
     */
    private sendToAnalytics(metrics: PdfPerformanceMetrics) {
        // 整合到現有的監控系統
        if (typeof window !== 'undefined') {
            // Google Analytics 4
            const gtag = (window as GtagWindow).gtag;
            if (gtag) {
                gtag('event', 'pdf_generation', {
                    event_category: 'performance',
                    total_time: metrics.totalTime,
                    render_time: metrics.renderTime,
                    pdf_size: metrics.pdfSize,
                    item_count: metrics.itemCount,
                    cache_hit: metrics.cacheHitRate === 1,
                });
            }

            // 自訂分析端點
            if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
                fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'pdf_performance',
                        metrics,
                        timestamp: new Date().toISOString(),
                    }),
                }).catch(err => console.debug('Analytics failed:', err));
            }
        }
    }

    /**
     * 獲取當前記憶體使用量 (如果可用)
     */
    getMemoryUsage(): number | undefined {
        const perf = performance as PerformanceWithMemory | undefined;
        if (typeof performance !== 'undefined' && perf?.memory) {
            return perf.memory.usedJSHeapSize;
        }
        return undefined;
    }
}

/**
 * 效能預算定義
 */
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
        small: 800,   // 5 項目以下 < 800ms
        medium: 1500, // 5-20 項目 < 1.5s
        large: 3000,  // 20-50 項目 < 3s
        xlarge: 5000, // 50+ 項目 < 5s
    },

    // 資源預算
    maxPdfSize: 2 * 1024 * 1024,    // 2MB
    maxMemoryIncrease: 50 * 1024 * 1024, // 50MB

    // 品質預算
    minCacheHitRate: 0.6,           // 快取命中率 > 60%
};

/**
 * 獲取檔案大小分類
 */
function getSizeCategory(itemCount: number): keyof typeof PERFORMANCE_BUDGETS.totalTime {
    if (itemCount <= 5) return 'small';
    if (itemCount <= 20) return 'medium';
    if (itemCount <= 50) return 'large';
    return 'xlarge';
}

/**
 * 驗證效能是否符合預算
 */
export function validatePerformance(
    metrics: PdfPerformanceMetrics,
    itemCount: number
): { passed: boolean; violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];

    const sizeCategory = getSizeCategory(itemCount);

    // 檢查總時間
    const totalTimeBudget = PERFORMANCE_BUDGETS.totalTime[sizeCategory];
    if (metrics.totalTime > totalTimeBudget) {
        violations.push(
            `總時間 ${metrics.totalTime.toFixed(0)}ms 超過預算 ${totalTimeBudget}ms`
        );
    } else if (metrics.totalTime > totalTimeBudget * 0.8) {
        warnings.push(
            `總時間 ${metrics.totalTime.toFixed(0)}ms 接近預算 ${totalTimeBudget}ms`
        );
    }

    // 檢查渲染時間
    if (metrics.renderTime) {
        const renderTimeBudget = PERFORMANCE_BUDGETS.renderTime[sizeCategory];
        if (metrics.renderTime > renderTimeBudget) {
            violations.push(
                `渲染時間 ${metrics.renderTime.toFixed(0)}ms 超過預算 ${renderTimeBudget}ms`
            );
        }
    }

    // 檢查 PDF 大小
    if (metrics.pdfSize && metrics.pdfSize > PERFORMANCE_BUDGETS.maxPdfSize) {
        violations.push(
            `PDF 大小 ${(metrics.pdfSize / 1024 / 1024).toFixed(2)}MB 超過預算 ${PERFORMANCE_BUDGETS.maxPdfSize / 1024 / 1024}MB`
        );
    }

    // 檢查快取命中率
    if (metrics.cacheHitRate !== undefined && metrics.cacheHitRate < PERFORMANCE_BUDGETS.minCacheHitRate) {
        warnings.push(
            `快取命中率 ${(metrics.cacheHitRate * 100).toFixed(0)}% 低於目標 ${PERFORMANCE_BUDGETS.minCacheHitRate * 100}%`
        );
    }

    return {
        passed: violations.length === 0,
        violations,
        warnings,
    };
}

/**
 * 格式化效能報告
 */
export function formatPerformanceReport(metrics: PdfPerformanceMetrics): string {
    const lines: string[] = [];

    lines.push('=== PDF Generation Performance Report ===');
    lines.push('');

    if (metrics.totalTime !== undefined) {
        lines.push(`總時間: ${metrics.totalTime.toFixed(0)}ms`);
    }

    if (metrics.renderTime !== undefined) {
        lines.push(`渲染時間: ${metrics.renderTime.toFixed(0)}ms`);
    }

    if (metrics.dataPreparationTime !== undefined) {
        lines.push(`資料準備: ${metrics.dataPreparationTime.toFixed(0)}ms`);
    }

    if (metrics.pdfSize !== undefined) {
        const sizeMB = (metrics.pdfSize / 1024 / 1024).toFixed(2);
        lines.push(`PDF 大小: ${sizeMB}MB`);
    }

    if (metrics.itemCount !== undefined) {
        lines.push(`項目數量: ${metrics.itemCount}`);
    }

    if (metrics.cacheHitRate !== undefined) {
        const status = metrics.cacheHitRate === 1 ? '✅ 快取命中' : '⚠️ 快取未命中';
        lines.push(`快取狀態: ${status}`);
    }

    lines.push('');
    lines.push('==========================================');

    return lines.join('\n');
}
