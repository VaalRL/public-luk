"use client";

import React, { useState } from "react";
import _dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Download, Loader2, AlertTriangle } from "lucide-react";
import { InvoicePdfDocument } from "@/components/invoice-pdf";
import { pdf } from "@react-pdf/renderer";
import { PdfPerformanceMonitor } from "@/lib/performance-metrics";
import { savePdfBackup } from "@/app/actions/pdf-backup";
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

interface InvoiceDownloadButtonProps {
    invoice: PdfInvoice;
    fileName?: string;
}

export function InvoiceDownloadButton({ invoice, fileName }: InvoiceDownloadButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
    const [cacheKey, setCacheKey] = useState<string>('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Estimate if PDF will exceed one page
    const estimatePages = () => {
        const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
        const serviceItems = items.filter((item: InvoiceItem) => !item.type || item.type === 'service');
        const reimbursementItems = items.filter((item: InvoiceItem) => item.type === 'reimbursement');
        const bankAccounts = invoice.provider?.bankAccounts ?? [];

        let height = 0;

        // Base layout heights (points)
        height += 100; // Header (Logo + Title)
        height += 40;  // Header Info
        height += 120; // Parties Info

        // Service Table
        if (serviceItems.length > 0) {
            height += 24; // Header
            height += serviceItems.length * 24; // Rows
            height += 60; // Totals
            height += 20; // Margin
        }

        // Reimbursement Table
        if (reimbursementItems.length > 0) {
            height += 24; // Header
            height += reimbursementItems.length * 24; // Rows
            height += 40; // Totals
            height += 20; // Margin
        }

        height += 40; // Grand Total

        // Bank Info
        if (bankAccounts.length > 0) {
            height += 25; // Title
            height += 24; // Header
            height += bankAccounts.length * 24; // Rows
            height += 20; // Margin
        }

        height += 100; // Footer/Signature buffer

        // A4 height (842pt) - Padding (60pt) = 782pt
        return height > 780;
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

            // Generate a cache key based on invoice content
            // We use ID and updatedAt to invalidate cache if invoice changes
            const currentKey = JSON.stringify({
                id: invoice.id,
                updatedAt: invoice.updatedAt,
                invoiceNumber: invoice.invoiceNumber ?? undefined,
                amount: invoice.totalAmount
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
                blob = await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();

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
            alert("PDF 生成失敗，請稍後再試");
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
                                <p>內容可能超過一頁</p>
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
                    <span className="sr-only">下載 PDF</span>
                </Button>
            </div>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確認下載</AlertDialogTitle>
                        <AlertDialogDescription>
                            此帳單內容較多，可能會超過一頁 PDF。確定要繼續下載嗎？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={generateAndDownload}>
                            確定下載
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
