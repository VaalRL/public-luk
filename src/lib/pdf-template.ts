/**
 * 報價單 PDF 的版型設定
 *
 * PDF 上的每一段文字（甲方／乙方、表頭、合計列、收款資訊）以及版面尺寸
 * 原本都寫死在 invoice-pdf.tsx 裡，換一種說法或換個欄寬就得改程式。
 * 這裡把它們抽成一份可儲存、可驗證的設定，預設值即為原本的輸出，
 * 所以沒有設定過的使用者看到的 PDF 與先前完全相同。
 *
 * 設定值存在 SystemConfig（key = PDF_TEMPLATE_CONFIG_KEY）的 JSON 字串裡，
 * 讀取時一律經過 resolvePdfTemplate() 與預設值合併 —— 舊資料缺少新欄位、
 * 或有人手動塞了壞值，都會退回預設而不是讓 PDF 產生失敗。
 */

import { z } from "zod";
import { format } from "date-fns";
import type { MessageKey } from "@/lib/i18n/messages";

export const PDF_TEMPLATE_CONFIG_KEY = "pdf_template";

/** 單一標籤的長度上限：超過這個字數版面一定會被撐爛 */
const MAX_LABEL_LENGTH = 60;

const label = z.string().trim().max(MAX_LABEL_LENGTH);

export const pdfLabelsSchema = z.object({
    /**
     * 新帳單的預設標題（開新帳單時填入表單），同時也是帳單標題為空時
     * PDF 上的後備標題。
     */
    documentTitle: z.string().trim().min(1).max(MAX_LABEL_LENGTH),
    date: label,
    invoiceNumber: label,
    clientBlock: label,
    providerBlock: label,
    companyName: label,
    taxId: label,
    contactName: label,
    phone: label,
    email: label,
    address: label,
    serviceSection: label,
    reimbursementSection: label,
    itemName: label,
    itemContent: label,
    quantity: label,
    unitPrice: label,
    lineTotal: label,
    itemNote: label,
    subtotal: label,
    /** 可用 {rate} 代入實際稅率，例如「營業稅 ({rate}%)」 */
    tax: label,
    serviceTotal: label,
    reimbursementTotal: label,
    grandTotal: label,
    bankSection: label,
    bankCurrency: label,
    bankName: label,
    bankBranch: label,
    bankAccountNumber: label,
    bankAccountHolder: label,
    signatureClient: label,
    signatureProvider: label,
    /** 欄位沒有值時顯示的字元 */
    emptyValue: z.string().trim().max(4),
});

export type PdfLabels = z.infer<typeof pdfLabelsSchema>;
export type PdfLabelKey = keyof PdfLabels;

const columnWidthsSchema = z
    .object({
        category: z.number().min(1).max(100),
        name: z.number().min(1).max(100),
        content: z.number().min(1).max(100),
        quantity: z.number().min(1).max(100),
        price: z.number().min(1).max(100),
        total: z.number().min(1).max(100),
        note: z.number().min(1).max(100),
    })
    // 欄寬是百分比，加起來不是 100 的話表格會凸出或縮排，
    // 與其印出歪掉的單據，不如在儲存時就擋下來。
    .refine(
        (cols) => Math.abs(Object.values(cols).reduce((a, b) => a + b, 0) - 100) < 0.01,
        { message: "欄寬總和必須等於 100%" }
    );

export type PdfColumnWidths = z.infer<typeof columnWidthsSchema>;

export const pdfLayoutSchema = z.object({
    pageSize: z.enum(["A4", "A5", "LETTER", "LEGAL"]),
    /** 頁面留白（pt） */
    pagePadding: z.number().min(0).max(100),
    baseFontSize: z.number().min(6).max(16),
    titleFontSize: z.number().min(10).max(48),
    logoWidth: z.number().min(20).max(300),
    logoHeight: z.number().min(20).max(300),
    stampWidth: z.number().min(20).max(300),
    stampHeight: z.number().min(20).max(300),
    stampRight: z.number().min(0).max(300),
    stampBottom: z.number().min(0).max(300),
    columnWidths: columnWidthsSchema,
});

export type PdfLayout = z.infer<typeof pdfLayoutSchema>;
export type PdfPageSize = PdfLayout["pageSize"];

/** 各紙張的高度（pt）。@react-pdf 內部用的也是這組數字。 */
export const PAGE_HEIGHT_PT: Record<PdfPageSize, number> = {
    A4: 841.89,
    A5: 595.28,
    LETTER: 792,
    LEGAL: 1008,
};

/** 扣掉上下留白後，一頁真正裝得下內容的高度（pt） */
export function usablePageHeight(layout: PdfLayout): number {
    return PAGE_HEIGHT_PT[layout.pageSize] - layout.pagePadding * 2;
}

export const pdfOptionsSchema = z.object({
    currencySymbol: z.string().trim().max(4),
    /** date-fns 的格式字串 */
    dateFormat: z
        .string()
        .trim()
        .min(1)
        .max(30)
        .refine((f) => {
            try {
                format(new Date(2026, 0, 31), f);
                return true;
            } catch {
                return false;
            }
        }, { message: "不是有效的日期格式" }),
    showLogo: z.boolean(),
    showStamp: z.boolean(),
    showTaxRow: z.boolean(),
    showBankAccounts: z.boolean(),
    showSignatures: z.boolean(),
    /** 印在單據下方的附註／條款，空字串代表不印 */
    footerNote: z.string().trim().max(500),
});

export type PdfOptions = z.infer<typeof pdfOptionsSchema>;

export const pdfTemplateSchema = z.object({
    labels: pdfLabelsSchema,
    layout: pdfLayoutSchema,
    options: pdfOptionsSchema,
});

export type PdfTemplate = z.infer<typeof pdfTemplateSchema>;

/** 部分設定：使用者只送出改過的欄位時使用 */
export const pdfTemplateInputSchema = z.object({
    labels: pdfLabelsSchema.partial().optional(),
    layout: pdfLayoutSchema.omit({ columnWidths: true }).partial()
        .extend({ columnWidths: columnWidthsSchema.optional() })
        .optional(),
    options: pdfOptionsSchema.partial().optional(),
});

export type PdfTemplateInput = z.infer<typeof pdfTemplateInputSchema>;

/**
 * 預設版型 —— 等同於這份設定存在之前 invoice-pdf.tsx 寫死的內容。
 * 動到這裡就等於動到所有沒自訂過的使用者的單據，請留意。
 */
export const defaultPdfTemplate: PdfTemplate = {
    labels: {
        documentTitle: "報價單",
        date: "日期：",
        invoiceNumber: "單號：",
        clientBlock: "甲方",
        providerBlock: "乙方",
        companyName: "公司名稱：",
        taxId: "統一編號：",
        contactName: "聯絡人：",
        phone: "電話：",
        email: "Email：",
        address: "地址：",
        serviceSection: "服務項目",
        reimbursementSection: "代墊費用",
        itemName: "項目名稱",
        itemContent: "內容",
        quantity: "數量",
        unitPrice: "單價",
        lineTotal: "總價",
        itemNote: "備註",
        subtotal: "銷售金額 (未稅)：",
        tax: "營業稅 ({rate}%)：",
        serviceTotal: "服務總計 (含稅)：",
        reimbursementTotal: "代墊小計：",
        grandTotal: "總計金額：",
        bankSection: "收款資訊",
        bankCurrency: "幣別",
        bankName: "銀行",
        bankBranch: "分行",
        bankAccountNumber: "帳號",
        bankAccountHolder: "戶名",
        signatureClient: "甲方簽章",
        signatureProvider: "乙方簽章",
        emptyValue: "-",
    },
    layout: {
        pageSize: "A4",
        pagePadding: 30,
        baseFontSize: 10,
        titleFontSize: 24,
        logoWidth: 120,
        logoHeight: 80,
        stampWidth: 80,
        stampHeight: 80,
        stampRight: 40,
        stampBottom: 40,
        columnWidths: {
            category: 15,
            name: 15,
            content: 25,
            quantity: 8,
            price: 12,
            total: 15,
            note: 10,
        },
    },
    options: {
        currencySymbol: "$",
        dateFormat: "yyyy/MM/dd",
        showLogo: true,
        showStamp: true,
        showTaxRow: true,
        showBankAccounts: true,
        // 簽章欄先前沒有輸出過，維持不印，需要的人自己打開
        showSignatures: false,
        footerNote: "",
    },
};

/**
 * 把（可能不完整、可能有壞值的）設定合併到預設值上。
 *
 * PDF 是要寄給客戶的東西，寧可印出預設樣式也不能因為設定壞掉就產不出來，
 * 所以這裡不丟例外：整份解析失敗回傳預設值，個別區塊失敗只退回該區塊。
 */
export function resolvePdfTemplate(stored: unknown): PdfTemplate {
    if (!stored || typeof stored !== "object") return defaultPdfTemplate;

    /** 只有真的是物件才展開，其餘（字串、null、陣列）一律當成沒設定 */
    const asObject = (value: unknown): Record<string, unknown> =>
        value !== null && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};

    const source = asObject(stored);
    const storedLayout = asObject(source.layout);

    const labels = pdfLabelsSchema.safeParse({
        ...defaultPdfTemplate.labels,
        ...asObject(source.labels),
    });

    const layout = pdfLayoutSchema.safeParse({
        ...defaultPdfTemplate.layout,
        ...storedLayout,
        columnWidths: {
            ...defaultPdfTemplate.layout.columnWidths,
            ...asObject(storedLayout.columnWidths),
        },
    });

    const options = pdfOptionsSchema.safeParse({
        ...defaultPdfTemplate.options,
        ...asObject(source.options),
    });

    return {
        labels: labels.success ? labels.data : defaultPdfTemplate.labels,
        layout: layout.success ? layout.data : defaultPdfTemplate.layout,
        options: options.success ? options.data : defaultPdfTemplate.options,
    };
}

/** 從 JSON 字串還原設定；壞掉的 JSON 一律當成沒設定過 */
export function parsePdfTemplate(json: string | null | undefined): PdfTemplate {
    if (!json) return defaultPdfTemplate;
    try {
        return resolvePdfTemplate(JSON.parse(json));
    } catch {
        return defaultPdfTemplate;
    }
}

/** 代入稅率：「營業稅 ({rate}%)：」→「營業稅 (5%)：」 */
export function applyTaxRate(labelText: string, rate: number): string {
    return labelText.replace(/\{rate\}/g, String(rate));
}

/**
 * 依設定格式化金額。
 * 這裡刻意不四捨五入 —— 單價可能有小數，PDF 應該照實印出，
 * 進位與否是建立帳單時就該決定的事。
 */
export function formatMoney(amount: number, options: PdfOptions): string {
    return `${options.currencySymbol}${amount.toLocaleString()}`;
}

/** 依設定格式化日期；格式字串壞掉時退回預設格式 */
export function formatPdfDate(date: Date | string, options: PdfOptions): string {
    const value = date instanceof Date ? date : new Date(date);
    try {
        return format(value, options.dateFormat);
    } catch {
        return format(value, defaultPdfTemplate.options.dateFormat);
    }
}

/**
 * 設定畫面用的欄位分組（放這裡是為了讓標籤鍵值只有一份定義）。
 * 分組標題本身是介面文字，所以存的是文案鍵而不是寫死的字串。
 */
export const pdfLabelGroups: { titleKey: MessageKey; keys: PdfLabelKey[] }[] = [
    { titleKey: "pdfTemplate.groups.header", keys: ["documentTitle", "date", "invoiceNumber"] },
    {
        titleKey: "pdfTemplate.groups.parties",
        keys: [
            "clientBlock", "providerBlock", "companyName", "taxId",
            "contactName", "phone", "email", "address",
        ],
    },
    {
        titleKey: "pdfTemplate.groups.items",
        keys: [
            "serviceSection", "reimbursementSection", "itemName", "itemContent",
            "quantity", "unitPrice", "lineTotal", "itemNote",
        ],
    },
    {
        titleKey: "pdfTemplate.groups.totals",
        keys: ["subtotal", "tax", "serviceTotal", "reimbursementTotal", "grandTotal"],
    },
    {
        titleKey: "pdfTemplate.groups.bank",
        keys: [
            "bankSection", "bankCurrency", "bankName", "bankBranch",
            "bankAccountNumber", "bankAccountHolder",
        ],
    },
    { titleKey: "pdfTemplate.groups.signature", keys: ["signatureClient", "signatureProvider", "emptyValue"] },
];
