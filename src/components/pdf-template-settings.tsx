"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, RotateCcw, Eye, Loader2 } from "lucide-react";
import { savePdfTemplate, resetPdfTemplate } from "@/app/actions/pdf-template";
import {
    defaultPdfTemplate,
    pdfLabelGroups,
    type PdfTemplate,
    type PdfLabelKey,
    type PdfColumnWidths,
} from "@/lib/pdf-template";
import { sampleInvoiceForPreview } from "@/lib/pdf-template-sample";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";

/** 版面設定裡可以直接填數字的欄位（排除紙張大小與欄寬） */
type LayoutNumberKey = Exclude<keyof PdfTemplate["layout"], "pageSize" | "columnWidths">;
type ColumnKey = keyof PdfColumnWidths;

/** 標籤欄位在設定畫面上的顯示名稱（對應文案鍵） */
const labelNameKeys: Record<PdfLabelKey, MessageKey> = {
    documentTitle: "pdfTemplate.labels.documentTitle",
    date: "pdfTemplate.labels.date",
    invoiceNumber: "pdfTemplate.labels.invoiceNumber",
    clientBlock: "pdfTemplate.labels.clientBlock",
    providerBlock: "pdfTemplate.labels.providerBlock",
    companyName: "pdfTemplate.labels.companyName",
    taxId: "pdfTemplate.labels.taxId",
    contactName: "pdfTemplate.labels.contactName",
    phone: "pdfTemplate.labels.phone",
    email: "pdfTemplate.labels.email",
    address: "pdfTemplate.labels.address",
    serviceSection: "pdfTemplate.labels.serviceSection",
    reimbursementSection: "pdfTemplate.labels.reimbursementSection",
    itemName: "pdfTemplate.labels.itemName",
    itemContent: "pdfTemplate.labels.itemContent",
    quantity: "pdfTemplate.labels.quantity",
    unitPrice: "pdfTemplate.labels.unitPrice",
    lineTotal: "pdfTemplate.labels.lineTotal",
    itemNote: "pdfTemplate.labels.itemNote",
    subtotal: "pdfTemplate.labels.subtotal",
    tax: "pdfTemplate.labels.tax",
    serviceTotal: "pdfTemplate.labels.serviceTotal",
    reimbursementTotal: "pdfTemplate.labels.reimbursementTotal",
    grandTotal: "pdfTemplate.labels.grandTotal",
    bankSection: "pdfTemplate.labels.bankSection",
    bankCurrency: "pdfTemplate.labels.bankCurrency",
    bankName: "pdfTemplate.labels.bankName",
    bankBranch: "pdfTemplate.labels.bankBranch",
    bankAccountNumber: "pdfTemplate.labels.bankAccountNumber",
    bankAccountHolder: "pdfTemplate.labels.bankAccountHolder",
    signatureClient: "pdfTemplate.labels.signatureClient",
    signatureProvider: "pdfTemplate.labels.signatureProvider",
    emptyValue: "pdfTemplate.labels.emptyValue",
};

const layoutNumberFields: { key: LayoutNumberKey; nameKey: MessageKey }[] = [
    { key: "pagePadding", nameKey: "pdfTemplate.layout.pagePadding" },
    { key: "baseFontSize", nameKey: "pdfTemplate.layout.baseFontSize" },
    { key: "titleFontSize", nameKey: "pdfTemplate.layout.titleFontSize" },
    { key: "logoWidth", nameKey: "pdfTemplate.layout.logoWidth" },
    { key: "logoHeight", nameKey: "pdfTemplate.layout.logoHeight" },
    { key: "stampWidth", nameKey: "pdfTemplate.layout.stampWidth" },
    { key: "stampHeight", nameKey: "pdfTemplate.layout.stampHeight" },
    { key: "stampRight", nameKey: "pdfTemplate.layout.stampRight" },
    { key: "stampBottom", nameKey: "pdfTemplate.layout.stampBottom" },
];

const columnFields: { key: ColumnKey; nameKey: MessageKey }[] = [
    { key: "category", nameKey: "pdfTemplate.columns.category" },
    { key: "name", nameKey: "pdfTemplate.columns.name" },
    { key: "content", nameKey: "pdfTemplate.columns.content" },
    { key: "quantity", nameKey: "pdfTemplate.columns.quantity" },
    { key: "price", nameKey: "pdfTemplate.columns.price" },
    { key: "total", nameKey: "pdfTemplate.columns.total" },
    { key: "note", nameKey: "pdfTemplate.columns.note" },
];

type ToggleKey = "showLogo" | "showStamp" | "showTaxRow" | "showBankAccounts" | "showSignatures";

const toggles: { key: ToggleKey; nameKey: MessageKey }[] = [
    { key: "showLogo", nameKey: "pdfTemplate.options.showLogo" },
    { key: "showStamp", nameKey: "pdfTemplate.options.showStamp" },
    { key: "showTaxRow", nameKey: "pdfTemplate.options.showTaxRow" },
    { key: "showBankAccounts", nameKey: "pdfTemplate.options.showBankAccounts" },
    { key: "showSignatures", nameKey: "pdfTemplate.options.showSignatures" },
];

/** 數字欄位以字串保存，讓使用者可以清空後重打，而不是一清空就被塞回 0 */
type NumberDraft = Record<LayoutNumberKey, string> & { columns: Record<ColumnKey, string> };

function toDraft(template: PdfTemplate): NumberDraft {
    const draft = {} as NumberDraft;
    for (const f of layoutNumberFields) draft[f.key] = String(template.layout[f.key]);
    draft.columns = {} as Record<ColumnKey, string>;
    for (const c of columnFields) draft.columns[c.key] = String(template.layout.columnWidths[c.key]);
    return draft;
}

interface PdfTemplateSettingsProps {
    initialTemplate: PdfTemplate;
}

export function PdfTemplateSettings({ initialTemplate }: PdfTemplateSettingsProps) {
    const { toast } = useToast();
    const t = useT();
    const [template, setTemplate] = useState<PdfTemplate>(initialTemplate);
    const [numbers, setNumbers] = useState<NumberDraft>(() => toDraft(initialTemplate));
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // 換一份預覽或離開設定頁時，把上一份 blob 釋放掉
    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    const columnSum = columnFields.reduce((sum, c) => sum + (Number(numbers.columns[c.key]) || 0), 0);
    const columnSumOk = Math.abs(columnSum - 100) < 0.01;

    const setLabel = (key: PdfLabelKey, value: string) =>
        setTemplate((t) => ({ ...t, labels: { ...t.labels, [key]: value } }));

    const setOption = <K extends keyof PdfTemplate["options"]>(key: K, value: PdfTemplate["options"][K]) =>
        setTemplate((t) => ({ ...t, options: { ...t.options, [key]: value } }));

    /**
     * 把畫面上的字串數字轉回設定物件；有欄位不是數字時回傳 null 由呼叫端擋下。
     *
     * 空字串要當成錯誤，不能交給 Number() —— Number("") 是 0，
     * 而留白、印章位置的下限就是 0，欄位被清空會無聲存成 0（內容貼到紙邊）。
     */
    const toNumber = (raw: string): number | null => {
        if (raw.trim() === "") return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    };

    const buildTemplate = (): PdfTemplate | null => {
        const layout = { ...template.layout };
        for (const f of layoutNumberFields) {
            const n = toNumber(numbers[f.key]);
            if (n === null) return null;
            layout[f.key] = n;
        }
        const columnWidths = { ...template.layout.columnWidths };
        for (const c of columnFields) {
            const n = toNumber(numbers.columns[c.key]);
            if (n === null) return null;
            columnWidths[c.key] = n;
        }
        return { ...template, layout: { ...layout, columnWidths } };
    };

    const handleSave = async () => {
        const payload = buildTemplate();
        if (!payload) {
            toast({ title: t("common.saveFailed"), description: t("pdfTemplate.numbersRequired"), variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const result = await savePdfTemplate(payload);
            if (result.success) {
                setTemplate(result.data);
                setNumbers(toDraft(result.data));
                // 舊的預覽已經不代表現在的設定了，清掉以免誤導
                setPreviewUrl(null);
                toast({ title: t("common.saveSuccess"), description: t("pdfTemplate.saved") });
            } else {
                toast({ title: t("common.saveFailed"), description: result.error, variant: "destructive" });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        setIsSaving(true);
        try {
            const result = await resetPdfTemplate();
            if (result.success) {
                setTemplate(result.data);
                setNumbers(toDraft(result.data));
                setPreviewUrl(null);
                toast({ title: t("pdfTemplate.resetDone"), description: t("pdfTemplate.resetDoneDescription") });
            } else {
                toast({ title: t("pdfTemplate.resetFailed"), description: result.error, variant: "destructive" });
            }
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * 用一張虛構的範例帳單即時產生 PDF，直接嵌在頁面上。
     * 版型改到一半就能看到結果，不必先存檔再回頭下載真實帳單。
     *
     * 刻意不用 window.open —— PDF 是 await 之後才產生好的，
     * 那時使用者手勢已經結束，瀏覽器會把新視窗當成彈出視窗擋掉。
     */
    const handlePreview = async () => {
        const payload = buildTemplate();
        if (!payload) {
            toast({ title: t("pdfTemplate.previewInvalid"), description: t("pdfTemplate.numbersRequired"), variant: "destructive" });
            return;
        }

        setIsPreviewing(true);
        try {
            // @react-pdf/renderer 只在需要時才載入，避免設定頁一開就付出這個成本
            const [{ pdf }, { InvoicePdfDocument }] = await Promise.all([
                import("@react-pdf/renderer"),
                import("@/components/invoice-pdf"),
            ]);
            const blob = await pdf(
                <InvoicePdfDocument invoice={sampleInvoiceForPreview} template={payload} />
            ).toBlob();

            // 舊的 blob 由下面的 useEffect 清理，這裡只負責換上新的
            setPreviewUrl(URL.createObjectURL(blob));
        } catch (error) {
            console.error("預覽 PDF 失敗:", error);
            toast({ title: t("pdfTemplate.previewFailed"), description: t("pdfTemplate.checkLayout"), variant: "destructive" });
        } finally {
            setIsPreviewing(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {t("pdfTemplate.title")}
                    </CardTitle>
                    <CardDescription>
                        {t("pdfTemplate.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {t("common.save")}
                    </Button>
                    <Button variant="outline" onClick={handlePreview} disabled={isPreviewing}>
                        {isPreviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                        {t("pdfTemplate.preview")}
                    </Button>
                    <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {t("pdfTemplate.reset")}
                    </Button>
                </CardContent>
            </Card>

            {/* 預覽 */}
            {previewUrl && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t("pdfTemplate.previewTitle")}</CardTitle>
                        <CardDescription>
                            {t("pdfTemplate.previewDescription")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <iframe
                            src={previewUrl}
                            title={t("pdfTemplate.previewFrameTitle")}
                            className="w-full h-[600px] rounded-md border"
                        />
                    </CardContent>
                </Card>
            )}

            {/* 文字標籤 */}
            {pdfLabelGroups.map((group) => (
                <Card key={group.titleKey}>
                    <CardHeader>
                        <CardTitle className="text-base">{t(group.titleKey)}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        {group.keys.map((key) => (
                            <div key={key} className="space-y-1.5">
                                <Label htmlFor={`label-${key}`}>{t(labelNameKeys[key])}</Label>
                                <Input
                                    id={`label-${key}`}
                                    value={template.labels[key]}
                                    placeholder={defaultPdfTemplate.labels[key]}
                                    onChange={(e) => setLabel(key, e.target.value)}
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}

            {/* 版面 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("pdfTemplate.layout.title")}</CardTitle>
                    <CardDescription>{t("pdfTemplate.layout.description")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="page-size">{t("pdfTemplate.layout.pageSize")}</Label>
                        <Select
                            value={template.layout.pageSize}
                            onValueChange={(v) =>
                                setTemplate((t) => ({
                                    ...t,
                                    layout: { ...t.layout, pageSize: v as PdfTemplate["layout"]["pageSize"] },
                                }))
                            }
                        >
                            <SelectTrigger id="page-size">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="A4">A4</SelectItem>
                                <SelectItem value="A5">A5</SelectItem>
                                <SelectItem value="LETTER">Letter</SelectItem>
                                <SelectItem value="LEGAL">Legal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {layoutNumberFields.map((f) => (
                        <div key={f.key} className="space-y-1.5">
                            <Label htmlFor={`layout-${f.key}`}>{t(f.nameKey)}</Label>
                            <Input
                                id={`layout-${f.key}`}
                                inputMode="decimal"
                                value={numbers[f.key]}
                                onChange={(e) => setNumbers((n) => ({ ...n, [f.key]: e.target.value }))}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* 欄寬 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("pdfTemplate.columns.title")}</CardTitle>
                    <CardDescription>
                        {t("pdfTemplate.columns.description")}
                        <span className={columnSumOk ? "text-foreground" : "text-red-600 dark:text-red-400 font-semibold"}>
                            {" "}{Math.round(columnSum * 100) / 100}%
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                    {columnFields.map((c) => (
                        <div key={c.key} className="space-y-1.5">
                            <Label htmlFor={`col-${c.key}`}>{t(c.nameKey)}</Label>
                            <Input
                                id={`col-${c.key}`}
                                inputMode="decimal"
                                value={numbers.columns[c.key]}
                                onChange={(e) =>
                                    setNumbers((n) => ({
                                        ...n,
                                        columns: { ...n.columns, [c.key]: e.target.value },
                                    }))
                                }
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* 顯示內容 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("pdfTemplate.options.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {toggles.map((toggle) => (
                            <div key={toggle.key} className="flex items-center gap-2">
                                <Checkbox
                                    id={`toggle-${toggle.key}`}
                                    checked={template.options[toggle.key]}
                                    onCheckedChange={(checked) => setOption(toggle.key, checked === true)}
                                />
                                <Label htmlFor={`toggle-${toggle.key}`} className="font-normal">
                                    {t(toggle.nameKey)}
                                </Label>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="currency-symbol">{t("pdfTemplate.options.currencySymbol")}</Label>
                            <Input
                                id="currency-symbol"
                                value={template.options.currencySymbol}
                                onChange={(e) => setOption("currencySymbol", e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="date-format">{t("pdfTemplate.options.dateFormat")}</Label>
                            <Input
                                id="date-format"
                                value={template.options.dateFormat}
                                placeholder="yyyy/MM/dd"
                                onChange={(e) => setOption("dateFormat", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="footer-note">{t("pdfTemplate.options.footerNote")}</Label>
                        <Textarea
                            id="footer-note"
                            rows={3}
                            value={template.options.footerNote}
                            placeholder={t("pdfTemplate.options.footerNotePlaceholder")}
                            onChange={(e) => setOption("footerNote", e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
