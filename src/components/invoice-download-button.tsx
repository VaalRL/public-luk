"use client";

import React, { useEffect, useState } from "react";
import _dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import { Download, Loader2, AlertTriangle } from "lucide-react";
import { InvoicePdfDocument } from "@/components/invoice-pdf";
import { pdf } from "@react-pdf/renderer";
import { PdfPerformanceMonitor } from "@/lib/performance-metrics";
import { savePdfBackup } from "@/app/actions/pdf-backup";
import { getPdfTemplate } from "@/app/actions/pdf-template";
import { defaultPdfTemplate, usablePageHeight, type PdfTemplate } from "@/lib/pdf-template";
import type { PdfInvoice, InvoiceItem } from "@/types/invoice-pdf";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * 版型設定由所有下載按鈕共用一次讀取。
 *
 * 帳單列表一頁可能有幾十顆按鈕，各自去讀就是幾十次 server action。
 * 這份快取只餵給「是否超過一頁」的估算；真正產生 PDF 時仍會重新讀取，
 * 確保剛在設定頁改完的版型立刻生效。
 */
let sharedTemplate: PdfTemplate = defaultPdfTemplate;
let sharedTemplatePromise: Promise<PdfTemplate> | null = null;

function loadSharedTemplate(): Promise<PdfTemplate> {
    if (!sharedTemplatePromise) {
        sharedTemplatePromise = getPdfTemplate()
            .then((t) => {
                sharedTemplate = t;
                return t;
            })
            .catch((error) => {
                console.error("讀取 PDF 版型設定失敗，改用預設版型:", error);
                return defaultPdfTemplate;
            });
    }
    return sharedTemplatePromise;
}

interface InvoiceDownloadButtonProps {
    invoice: PdfInvoice;
    fileName?: string;
}

export function InvoiceDownloadButton({ invoice, fileName }: InvoiceDownloadButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
    const [cacheKey, setCacheKey] = useState<string>('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const t = useT();
    const [template, setTemplate] = useState<PdfTemplate>(sharedTemplate);

    // 只為了「是否超過一頁」的估算；共用快取，整頁按鈕合計只讀一次
    useEffect(() => {
        let active = true;
        loadSharedTemplate().then((t) => {
            if (active) setTemplate(t);
        });
        return () => { active = false; };
    }, []);

    /**
     * 粗估內容會不會超過一頁。
     *
     * 這只是個提醒用的啟發式估算，不是精確排版；但紙張、留白、字級、
     * 簽章欄都可以在設定頁調整，所以不能再寫死 A4 與 10pt
     * —— 換成 A5 之後可用高度只剩約 535pt，寫死 780 等於永遠不會示警。
     */
    const estimatePages = () => {
        const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
        const serviceItems = items.filter((item: InvoiceItem) => !item.type || item.type === 'service');
        const reimbursementItems = items.filter((item: InvoiceItem) => item.type === 'reimbursement');
        const bankAccounts = invoice.provider?.bankAccounts ?? [];
        const { layout, options } = template;

        // 各區塊高度原本是照 10pt 內文抓的，字級改了就等比放大
        const scale = layout.baseFontSize / defaultPdfTemplate.layout.baseFontSize;
        const rowHeight = Math.max(24, 24 * scale);

        let height = 0;

        // Base layout heights (points)
        const hasLogo = options.showLogo && Boolean(invoice.provider?.logoPath);
        height += (hasLogo ? layout.logoHeight + 20 : 20) + layout.titleFontSize;  // Header
        height += 40 * scale;   // Header Info
        height += 120 * scale;  // Parties Info

        // Service Table
        if (serviceItems.length > 0) {
            height += rowHeight;                       // Header
            height += serviceItems.length * rowHeight; // Rows
            height += (options.showTaxRow ? 60 : 40) * scale; // Totals
            height += 20; // Margin
        }

        // Reimbursement Table
        if (reimbursementItems.length > 0) {
            height += rowHeight;
            height += reimbursementItems.length * rowHeight;
            height += 40 * scale; // Totals
            height += 20; // Margin
        }

        height += 40 * scale; // Grand Total

        // Bank Info
        if (options.showBankAccounts && bankAccounts.length > 0) {
            height += 25;                              // Title
            height += rowHeight;                       // Header
            height += bankAccounts.length * rowHeight; // Rows
            height += 20; // Margin
        }

        if (options.showSignatures) height += 150;      // 簽章欄（含上下 margin）
        if (options.footerNote !== "") height += 40;    // 附註

        height += 40; // 邊界緩衝

        return height > usablePageHeight(layout);
    };

    const isMultiPage = estimatePages();

    const handleDownloadClick = () => {
        if (isMultiPage) {
            setShowConfirmDialog(true);
        } else {
            generateAndDownload();
        }
    };

    const generateAndDownload = async () => {
        // Initialize performance monitor
        const monitor = new PdfPerformanceMonitor();

        try {
            setIsGenerating(true);
            setShowConfirmDialog(false);

            // 版型設定每次產生前重新讀取。設定頁改完版型後如果這裡沿用舊值，
            // 使用者會以為設定沒生效 —— 本機 SQLite 讀一列的成本遠低於這個誤會。
            let freshTemplate: PdfTemplate = template;
            try {
                freshTemplate = await getPdfTemplate();
                // 讓其他按鈕的估算也跟上剛剛存的版型
                sharedTemplate = freshTemplate;
                sharedTemplatePromise = Promise.resolve(freshTemplate);
                setTemplate(freshTemplate);
            } catch (templateError) {
                console.error("讀取 PDF 版型設定失敗，改用上一次讀到的版型:", templateError);
            }

            // Generate a cache key based on invoice content
            // We use ID and updatedAt to invalidate cache if invoice changes
            // 版型也算進 key：同一張帳單換了版型必須重新產生
            const currentKey = JSON.stringify({
                id: invoice.id,
                updatedAt: invoice.updatedAt,
                invoiceNumber: invoice.invoiceNumber ?? undefined,
                amount: invoice.totalAmount,
                template: freshTemplate,
            });

            let blob: Blob;

            // Check if we have a valid cached blob
            if (cachedBlob && cacheKey === currentKey) {
                console.log("Using cached PDF blob");
                blob = cachedBlob;
                monitor.cacheHit = true;
            } else {
                console.log("Generating new PDF blob");
                monitor.start();

                // Generate the blob
                blob = await pdf(<InvoicePdfDocument invoice={invoice} template={freshTemplate} />).toBlob();

                // Update cache
                setCachedBlob(blob);
                setCacheKey(currentKey);
                monitor.cacheHit = false;
            }

            const url = URL.createObjectURL(blob);

            // Create a link and click it
            const link = document.createElement('a');
            link.href = url;
            const downloadFileName = fileName || `invoice-${invoice.invoiceNumber || 'draft'}.pdf`;
            link.download = downloadFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // We don't revoke immediately if we want to keep the blob in memory for cache
            // But URL.createObjectURL creates a reference that should be cleaned up
            // Since we are caching the BLOB, not the URL, we can revoke the URL
            setTimeout(() => URL.revokeObjectURL(url), 100);

            // 自動備份 PDF 到本地資料夾
            try {
                const arrayBuffer = await blob.arrayBuffer();
                const backupResult = await savePdfBackup(
                    arrayBuffer,
                    downloadFileName,
                    {
                        invoiceNumber: invoice.invoiceNumber ?? undefined,
                        companyName: invoice.company?.name,
                        amount: invoice.totalAmount,
                    }
                );

                if (backupResult.success && process.env.NODE_ENV === 'development') {
                    console.log(`💾 PDF 已自動備份: ${backupResult.path}`);
                }
            } catch (backupError) {
                // 備份失敗不應影響下載功能
                console.error("PDF 備份失敗:", backupError);
            }

            // Report performance metrics
            if (!monitor.cacheHit) {
                const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
                monitor.setMetric('pdfSize', blob.size);
                monitor.setMetric('itemCount', items.length);
                monitor.setMetric('cacheHitRate', 0);
                const metrics = monitor.report();

                // Log metrics in development
                if (process.env.NODE_ENV === 'development') {
                    console.group('📊 PDF Generation Performance');
                    console.table(metrics);
                    console.groupEnd();
                }
            }

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert(t("invoicing.download.generateFailed"));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-1">
                {isMultiPage && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <AlertTriangle className="w-4 h-4 text-yellow-500 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t("invoicing.download.mayExceedOnePage")}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadClick}
                    disabled={isGenerating}
                    className={isMultiPage ? "text-yellow-600 hover:text-yellow-700" : ""}
                >
                    {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                    <span className="sr-only">{t("invoicing.download.label")}</span>
                </Button>
            </div>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("invoicing.download.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("invoicing.download.confirmDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={generateAndDownload}>
                            {t("invoicing.download.confirmDownload")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
