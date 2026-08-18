import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { registerPdfFonts, PDF_FONT_FAMILY } from '@/lib/pdf-fonts';
import type { PdfInvoice, PdfBankAccount, PdfCompany } from "@/types/invoice-pdf";
import { defaultProvider } from "@/lib/default-provider";
import { derivedTaxRate } from "@/lib/invoice-total";
import {
    defaultPdfTemplate,
    applyTaxRate,
    formatMoney,
    formatPdfDate,
    type PdfTemplate,
    type PdfLayout,
} from "@/lib/pdf-template";

// Register fonts once
registerPdfFonts();

/**
 * 版面樣式依設定產生。
 *
 * 這裡的每個數字先前都寫死在模組層的 StyleSheet.create 裡，換頁面大小、
 * 換欄寬、換印章位置都得改程式。改成由 PdfLayout 決定後，
 * 設定頁就能直接調整；沒有設定過的人拿到的仍是原本的版面。
 */
function createStyles(layout: PdfLayout) {
    const { columnWidths: col } = layout;
    return StyleSheet.create({
        page: {
            fontFamily: PDF_FONT_FAMILY,
            padding: layout.pagePadding,
            fontSize: layout.baseFontSize,
        },
        header: {
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 20,
        },
        logoContainer: {
            width: layout.logoWidth,
            height: layout.logoHeight,
            marginBottom: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        logo: {
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
        },
        title: {
            fontSize: layout.titleFontSize,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 10,
        },
        infoSection: {
            flexDirection: 'row',
            marginBottom: 20,
        },
        column: {
            flex: 1,
        },
        label: {
            width: 60,
            fontWeight: 'bold',
        },
        row: {
            flexDirection: 'row',
            marginBottom: 4,
        },
        table: {
            width: '100%',
            borderStyle: 'solid',
            borderWidth: 1,
            borderColor: '#000',
            marginBottom: 20,
        },
        tableRow: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: '#000',
            alignItems: 'center',
            minHeight: 24,
        },
        tableHeader: {
            backgroundColor: '#f0f0f0',
            fontWeight: 'bold',
        },
        tableCell: {
            padding: 4,
            borderRightWidth: 1,
            borderRightColor: '#000',
            textAlign: 'center',
        },
        lastCell: {
            borderRightWidth: 0,
        },
        // Column widths
        colCategory: { width: `${col.category}%` },
        colName: { width: `${col.name}%` },
        colContent: { width: `${col.content}%` },
        colQty: { width: `${col.quantity}%` },
        colPrice: { width: `${col.price}%` },
        colTotal: { width: `${col.total}%` },
        colNote: { width: `${col.note}%` },

        totals: {
            alignSelf: 'flex-end',
            width: '40%',
            marginTop: 10,
        },
        totalRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 4,
        },
        footerNote: {
            marginTop: 20,
            fontSize: Math.max(6, layout.baseFontSize - 1),
            lineHeight: 1.5,
        },
        stampContainer: {
            position: 'absolute',
            right: layout.stampRight,
            bottom: layout.stampBottom,
            width: layout.stampWidth,
            height: layout.stampHeight,
        },
        stamp: {
            width: '100%',
            height: '100%',
            objectFit: 'contain',
        },
        bankTable: {
            width: '100%',
            borderStyle: 'solid',
            borderWidth: 1,
            borderColor: '#000',
            marginTop: 20,
            marginBottom: 20,
        },
        bankTableRow: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: '#000',
            minHeight: 24,
        },
        bankTableHeader: {
            backgroundColor: '#f0f0f0',
            fontWeight: 'bold',
        },
        bankTableCell: {
            padding: 4,
            borderRightWidth: 1,
            borderRightColor: '#000',
            textAlign: 'center',
            fontSize: 9,
        },
        signatureSection: {
            flexDirection: 'row',
            marginTop: 30,
            marginBottom: 20,
            justifyContent: 'space-between',
        },
        signatureBox: {
            width: '45%',
            borderWidth: 1,
            borderColor: '#000',
            padding: 10,
            minHeight: 100,
        },
        signatureTitle: {
            fontWeight: 'bold',
            marginBottom: 8,
            fontSize: 11,
        },
        signatureText: {
            fontSize: 9,
            marginBottom: 3,
        },
    });
}

interface InvoiceItem {
    type?: string;
    name: string;
    content?: string;
    description?: string;
    quantity: number;
    price: number;
    amount: number;
    note?: string;
    category?: string;
}

interface InvoicePdfProps {
    invoice: PdfInvoice;
    /** 版型設定；未指定時使用預設版型 */
    template?: PdfTemplate;
}

export const InvoicePdfDocument = React.memo(({ invoice, template = defaultPdfTemplate }: InvoicePdfProps) => {
    const { labels, layout, options } = template;
    const styles = React.useMemo(() => createStyles(layout), [layout]);
    const money = React.useCallback((n: number) => formatMoney(n, options), [options]);

    const {
        serviceItems,
        reimbursementItems,
        serviceSubtotal,
        serviceTax,
        taxRate,
        serviceTotal,
        reimbursementTotal,
        grandTotal,
        provider,
        company
    } = React.useMemo(() => {
        const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
        const company: PdfCompany = invoice.company ?? { name: '' };

        // Use provider from invoice if available, otherwise fallback to the
        // environment-configured default (see src/lib/default-provider.ts)
        const provider = invoice.provider || defaultProvider;

        // Split items into service and reimbursement
        const serviceItems = items.filter((item: InvoiceItem) => !item.type || item.type === 'service');
        const reimbursementItems = items.filter((item: InvoiceItem) => item.type === 'reimbursement');

        // Pre-calculate totals for performance
        const serviceSubtotal = serviceItems.reduce((sum: number, item: InvoiceItem) => sum + item.amount, 0);
        // 稅額一律採用帳單上已儲存的值，不要在這裡重算。
        // 先前寫死 0.05 重算，稅率不是 5% 時，PDF 印出的稅額與總計
        // 會與資料庫裡的帳不一致 —— 寄給客戶的單據和自己的帳對不起來。
        const serviceTax = Math.round(invoice.taxAmount ?? 0);
        const taxRate = derivedTaxRate(serviceSubtotal, serviceTax);
        const serviceTotal = serviceSubtotal + serviceTax;

        const reimbursementTotal = reimbursementItems.reduce((sum: number, item: InvoiceItem) => sum + item.amount, 0);

        const grandTotal = serviceTotal + reimbursementTotal;

        return {
            serviceItems,
            reimbursementItems,
            serviceSubtotal,
            serviceTax,
            taxRate,
            serviceTotal,
            reimbursementTotal,
            grandTotal,
            provider,
            company
        };
    }, [invoice]);

    const empty = labels.emptyValue;

    const renderTable = (tableItems: InvoiceItem[], title: string, defaultCategory: string) => {
        if (tableItems.length === 0) return null;
        return (
            <View style={styles.table}>
                {/* Header */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, styles.colCategory]}>{title}</Text>
                    <Text style={[styles.tableCell, styles.colName]}>{labels.itemName}</Text>
                    <Text style={[styles.tableCell, styles.colContent]}>{labels.itemContent}</Text>
                    <Text style={[styles.tableCell, styles.colQty]}>{labels.quantity}</Text>
                    <Text style={[styles.tableCell, styles.colPrice]}>{labels.unitPrice}</Text>
                    <Text style={[styles.tableCell, styles.colTotal]}>{labels.lineTotal}</Text>
                    <Text style={[styles.tableCell, styles.colNote, styles.lastCell]}>{labels.itemNote}</Text>
                </View>

                {/* Rows */}
                {tableItems.map((item: InvoiceItem, index: number) => (
                    <View key={index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.colCategory]}>{item.category || defaultCategory}</Text>
                        <Text style={[styles.tableCell, styles.colName]}>{item.name}</Text>
                        <Text style={[styles.tableCell, styles.colContent]}>{item.content || item.description || ""}</Text>
                        <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                        <Text style={[styles.tableCell, styles.colPrice]}>{money(item.price)}</Text>
                        <Text style={[styles.tableCell, styles.colTotal]}>{money(item.amount)}</Text>
                        <Text style={[styles.tableCell, styles.colNote, styles.lastCell]}>{item.note || ""}</Text>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <Document>
            <Page size={layout.pageSize} style={styles.page}>
                {/* Logo and Title - Centered */}
                <View style={styles.header}>
                    {options.showLogo && provider.logoPath && (
                        <View style={styles.logoContainer}>
                            {/* eslint-disable-next-line jsx-a11y/alt-text -- 這是 @react-pdf/renderer 的 Image（PDF 元件），並非 HTML img，沒有 alt 屬性 */}
                            <Image src={provider.logoPath} style={styles.logo} />
                        </View>
                    )}
                    <Text style={styles.title}>{invoice.title || labels.documentTitle}</Text>
                </View>

                {/* Header Info - Centered */}
                <View style={{ marginBottom: 20, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                        <Text style={{ fontWeight: 'bold' }}>{labels.date}</Text>
                        <Text>{formatPdfDate(invoice.date, options)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={{ fontWeight: 'bold' }}>{labels.invoiceNumber}</Text>
                        <Text>{invoice.invoiceNumber || 'N/A'}</Text>
                    </View>
                </View>

                {/* Parties Info */}
                <View style={styles.infoSection}>
                    {/* Client (Party A) */}
                    <View style={styles.column}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>{labels.clientBlock}</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>{labels.companyName}</Text>
                            <Text>{company.name}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>{labels.taxId}</Text>
                            <Text>{company.taxId || empty}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>{labels.contactName}</Text>
                            <Text>{company.contactName || empty}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>{labels.phone}</Text>
                            <Text>{company.phone || empty}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>{labels.address}</Text>
                            <Text>{company.address || empty}</Text>
                        </View>
                    </View>

                    {/* Provider (Party B) */}
                    <View style={styles.column}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>{labels.providerBlock}</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>{labels.companyName}</Text>
                            <Text>{provider.name}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>{labels.taxId}</Text>
                            <Text>{provider.taxId || empty}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>{labels.contactName}</Text>
                            <Text>{provider.contactName || empty}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>{labels.phone}</Text>
                            <Text>{provider.phone || empty}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>{labels.email}</Text>
                            <Text>{provider.email || empty}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>{labels.address}</Text>
                            <Text>{provider.address || empty}</Text>
                        </View>
                    </View>
                </View>

                {/* Service Items Table */}
                {renderTable(serviceItems, labels.serviceSection, labels.serviceSection)}

                {/* Service Totals */}
                {serviceItems.length > 0 && (
                    <View style={styles.totals}>
                        <View style={styles.totalRow}>
                            <Text>{labels.subtotal}</Text>
                            <Text>{money(serviceSubtotal)}</Text>
                        </View>
                        {options.showTaxRow && (
                            <View style={styles.totalRow}>
                                <Text>{applyTaxRate(labels.tax, taxRate)}</Text>
                                <Text>{money(serviceTax)}</Text>
                            </View>
                        )}
                        <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 4 }]}>
                            <Text style={{ fontWeight: 'bold' }}>{labels.serviceTotal}</Text>
                            <Text style={{ fontWeight: 'bold' }}>{money(serviceTotal)}</Text>
                        </View>
                    </View>
                )}

                {/* Reimbursement Items Table */}
                {renderTable(reimbursementItems, labels.reimbursementSection, labels.reimbursementSection)}

                {/* Reimbursement Totals */}
                {reimbursementItems.length > 0 && (
                    <View style={styles.totals}>
                        <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 4 }]}>
                            <Text style={{ fontWeight: 'bold' }}>{labels.reimbursementTotal}</Text>
                            <Text style={{ fontWeight: 'bold' }}>{money(reimbursementTotal)}</Text>
                        </View>
                    </View>
                )}

                {/* Grand Total */}
                <View style={[styles.totals, { marginTop: 20 }]}>
                    <View style={[styles.totalRow, { borderTopWidth: 2, borderTopColor: '#000', paddingTop: 4 }]}>
                        <Text style={{ fontWeight: 'bold', fontSize: layout.baseFontSize + 2 }}>{labels.grandTotal}</Text>
                        <Text style={{ fontWeight: 'bold', fontSize: layout.baseFontSize + 2 }}>
                            {money(grandTotal)}
                        </Text>
                    </View>
                </View>

                {/* Bank Account Information Table */}
                {options.showBankAccounts && provider.bankAccounts && provider.bankAccounts.length > 0 && (
                    <View>
                        <Text style={{ fontWeight: 'bold', marginTop: 20, marginBottom: 5 }}>{labels.bankSection}</Text>
                        <View style={styles.bankTable}>
                            {/* Header */}
                            <View style={[styles.bankTableRow, styles.bankTableHeader]}>
                                <Text style={[styles.bankTableCell, { width: '15%' }]}>{labels.bankCurrency}</Text>
                                <Text style={[styles.bankTableCell, { width: '25%' }]}>{labels.bankName}</Text>
                                <Text style={[styles.bankTableCell, { width: '20%' }]}>{labels.bankBranch}</Text>
                                <Text style={[styles.bankTableCell, { width: '25%' }]}>{labels.bankAccountNumber}</Text>
                                <Text style={[styles.bankTableCell, { width: '15%', borderRightWidth: 0 }]}>{labels.bankAccountHolder}</Text>
                            </View>
                            {/* Rows */}
                            {(provider.bankAccounts ?? []).map((account: PdfBankAccount, index: number) => (
                                <View key={index} style={[styles.bankTableRow, index === (provider.bankAccounts ?? []).length - 1 ? { borderBottomWidth: 0 } : {}]}>
                                    <Text style={[styles.bankTableCell, { width: '15%' }]}>{account.currency || 'TWD'}</Text>
                                    <Text style={[styles.bankTableCell, { width: '25%' }]}>{account.note || empty}</Text>
                                    <Text style={[styles.bankTableCell, { width: '20%' }]}>{account.branch || empty}</Text>
                                    <Text style={[styles.bankTableCell, { width: '25%' }]}>{account.accountNumber || empty}</Text>
                                    <Text style={[styles.bankTableCell, { width: '15%', borderRightWidth: 0 }]}>{account.accountHolder || provider.name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* 簽章欄：樣式本來就在，改為由設定決定要不要印 */}
                {options.showSignatures && (
                    <View style={styles.signatureSection}>
                        <View style={styles.signatureBox}>
                            <Text style={styles.signatureTitle}>{labels.signatureClient}</Text>
                            <Text style={styles.signatureText}>{company.name}</Text>
                            <Text style={styles.signatureText}>{company.taxId || empty}</Text>
                        </View>
                        <View style={styles.signatureBox}>
                            <Text style={styles.signatureTitle}>{labels.signatureProvider}</Text>
                            <Text style={styles.signatureText}>{provider.name}</Text>
                            <Text style={styles.signatureText}>{provider.taxId || empty}</Text>
                        </View>
                    </View>
                )}

                {/* 附註／條款 */}
                {options.footerNote !== "" && (
                    <View style={styles.footerNote}>
                        <Text>{options.footerNote}</Text>
                    </View>
                )}

                {/* 用印：stampContainer / stamp 樣式本來就寫好了，只是從來沒有畫出來 */}
                {options.showStamp && provider.stampPath && (
                    <View style={styles.stampContainer}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer 的 Image 沒有 alt 屬性 */}
                        <Image src={provider.stampPath} style={styles.stamp} />
                    </View>
                )}

            </Page>
        </Document>
    );
});

InvoicePdfDocument.displayName = 'InvoicePdfDocument';
