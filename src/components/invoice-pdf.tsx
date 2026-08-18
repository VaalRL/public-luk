import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { registerPdfFonts } from '@/lib/pdf-fonts';
import type { PdfInvoice, PdfBankAccount, PdfCompany } from "@/types/invoice-pdf";
import { defaultProvider } from "@/lib/default-provider";
import { derivedTaxRate } from "@/lib/invoice-total";

// Register fonts once
registerPdfFonts();

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Noto Sans TC',
        padding: 30,
        fontSize: 10,
    },
    header: {
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 20,
    },
    logoContainer: {
        width: 120,
        height: 80,
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
        fontSize: 24,
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
    colCategory: { width: '15%' },
    colName: { width: '15%' },
    colContent: { width: '25%' }, // Increased width since description is removed
    colQty: { width: '8%' },
    colPrice: { width: '12%' },
    colTotal: { width: '15%' },
    colNote: { width: '10%' }, // Adjusted to fit 100%

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
    footer: {
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingTop: 10,
    },
    bankInfo: {
        marginTop: 10,
        fontSize: 9,
        lineHeight: 1.5,
    },
    stampContainer: {
        position: 'absolute',
        right: 40,
        bottom: 40,
        width: 80,
        height: 80,
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
}

export const InvoicePdfDocument = React.memo(({ invoice }: InvoicePdfProps) => {
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

    const renderTable = (tableItems: InvoiceItem[], title: string, defaultCategory: string) => {
        if (tableItems.length === 0) return null;
        return (
            <View style={styles.table}>
                {/* Header */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, styles.colCategory]}>{title}</Text>
                    <Text style={[styles.tableCell, styles.colName]}>項目名稱</Text>
                    <Text style={[styles.tableCell, styles.colContent]}>內容</Text>
                    <Text style={[styles.tableCell, styles.colQty]}>數量</Text>
                    <Text style={[styles.tableCell, styles.colPrice]}>單價</Text>
                    <Text style={[styles.tableCell, styles.colTotal]}>總價</Text>
                    <Text style={[styles.tableCell, styles.colNote, styles.lastCell]}>備註</Text>
                </View>

                {/* Rows */}
                {tableItems.map((item: InvoiceItem, index: number) => (
                    <View key={index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.colCategory]}>{item.category || defaultCategory}</Text>
                        <Text style={[styles.tableCell, styles.colName]}>{item.name}</Text>
                        <Text style={[styles.tableCell, styles.colContent]}>{item.content || item.description || ""}</Text>
                        <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                        <Text style={[styles.tableCell, styles.colPrice]}>${item.price.toLocaleString()}</Text>
                        <Text style={[styles.tableCell, styles.colTotal]}>${item.amount.toLocaleString()}</Text>
                        <Text style={[styles.tableCell, styles.colNote, styles.lastCell]}>{item.note || ""}</Text>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Logo and Title - Centered */}
                <View style={styles.header}>
                    {provider.logoPath && (
                        <View style={styles.logoContainer}>
                            {/* eslint-disable-next-line jsx-a11y/alt-text -- 這是 @react-pdf/renderer 的 Image（PDF 元件），並非 HTML img，沒有 alt 屬性 */}
                            <Image src={provider.logoPath} style={styles.logo} />
                        </View>
                    )}
                    <Text style={styles.title}>{invoice.title || "報價單"}</Text>
                </View>

                {/* Header Info - Centered */}
                <View style={{ marginBottom: 20, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                        <Text style={{ fontWeight: 'bold' }}>日期：</Text>
                        <Text>{format(new Date(invoice.date), 'yyyy/MM/dd')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={{ fontWeight: 'bold' }}>單號：</Text>
                        <Text>{invoice.invoiceNumber || 'N/A'}</Text>
                    </View>
                </View>

                {/* Parties Info */}
                <View style={styles.infoSection}>
                    {/* Client (Party A) */}
                    <View style={styles.column}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>甲方</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>公司名稱：</Text>
                            <Text>{company.name}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>統一編號：</Text>
                            <Text>{company.taxId || '-'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>聯絡人：</Text>
                            <Text>{company.contactName || '-'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>電話：</Text>
                            <Text>{company.phone || '-'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>地址：</Text>
                            <Text>{company.address || '-'}</Text>
                        </View>
                    </View>

                    {/* Provider (Party B) */}
                    <View style={styles.column}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>乙方</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>公司名稱：</Text>
                            <Text>{provider.name}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>統一編號：</Text>
                            <Text>{provider.taxId || '-'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>聯絡人：</Text>
                            <Text>{provider.contactName || '-'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>電話：</Text>
                            <Text>{provider.phone || '-'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Email：</Text>
                            <Text>{provider.email || '-'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>地址：</Text>
                            <Text>{provider.address || '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* Service Items Table */}
                {renderTable(serviceItems, "服務項目", "服務項目")}

                {/* Service Totals */}
                {serviceItems.length > 0 && (
                    <View style={styles.totals}>
                        <View style={styles.totalRow}>
                            <Text>銷售金額 (未稅)：</Text>
                            <Text>${serviceSubtotal.toLocaleString()}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text>營業稅 ({taxRate}%)：</Text>
                            <Text>${serviceTax.toLocaleString()}</Text>
                        </View>
                        <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 4 }]}>
                            <Text style={{ fontWeight: 'bold' }}>服務總計 (含稅)：</Text>
                            <Text style={{ fontWeight: 'bold' }}>
                                ${serviceTotal.toLocaleString()}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Reimbursement Items Table */}
                {renderTable(reimbursementItems, "代墊費用", "代墊費用")}

                {/* Reimbursement Totals */}
                {reimbursementItems.length > 0 && (
                    <View style={styles.totals}>
                        <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 4 }]}>
                            <Text style={{ fontWeight: 'bold' }}>代墊小計：</Text>
                            <Text style={{ fontWeight: 'bold' }}>${reimbursementTotal.toLocaleString()}</Text>
                        </View>
                    </View>
                )}

                {/* Grand Total */}
                <View style={[styles.totals, { marginTop: 20 }]}>
                    <View style={[styles.totalRow, { borderTopWidth: 2, borderTopColor: '#000', paddingTop: 4 }]}>
                        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>總計金額：</Text>
                        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>
                            ${grandTotal.toLocaleString()}
                        </Text>
                    </View>
                </View>

                {/* Bank Account Information Table */}
                {provider.bankAccounts && provider.bankAccounts.length > 0 && (
                    <View>
                        <Text style={{ fontWeight: 'bold', marginTop: 20, marginBottom: 5 }}>收款資訊</Text>
                        <View style={styles.bankTable}>
                            {/* Header */}
                            <View style={[styles.bankTableRow, styles.bankTableHeader]}>
                                <Text style={[styles.bankTableCell, { width: '15%' }]}>幣別</Text>
                                <Text style={[styles.bankTableCell, { width: '25%' }]}>銀行</Text>
                                <Text style={[styles.bankTableCell, { width: '20%' }]}>分行</Text>
                                <Text style={[styles.bankTableCell, { width: '25%' }]}>帳號</Text>
                                <Text style={[styles.bankTableCell, { width: '15%', borderRightWidth: 0 }]}>戶名</Text>
                            </View>
                            {/* Rows */}
                            {(provider.bankAccounts ?? []).map((account: PdfBankAccount, index: number) => (
                                <View key={index} style={[styles.bankTableRow, index === (provider.bankAccounts ?? []).length - 1 ? { borderBottomWidth: 0 } : {}]}>
                                    <Text style={[styles.bankTableCell, { width: '15%' }]}>{account.currency || 'TWD'}</Text>
                                    <Text style={[styles.bankTableCell, { width: '25%' }]}>{account.note || '-'}</Text>
                                    <Text style={[styles.bankTableCell, { width: '20%' }]}>{account.branch || '-'}</Text>
                                    <Text style={[styles.bankTableCell, { width: '25%' }]}>{account.accountNumber || '-'}</Text>
                                    <Text style={[styles.bankTableCell, { width: '15%', borderRightWidth: 0 }]}>{account.accountHolder || provider.name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* 用印：stampContainer / stamp 樣式本來就寫好了，只是從來沒有畫出來 */}
                {provider.stampPath && (
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
