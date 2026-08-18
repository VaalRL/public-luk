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

/** 標籤欄位在畫面上的顯示名稱 */
const labelNames: Record<PdfLabelKey, string> = {
    documentTitle: "預設標題",
    date: "日期",
    invoiceNumber: "單號",
    clientBlock: "買方區塊標題",
    providerBlock: "賣方區塊標題",
    companyName: "公司名稱",
    taxId: "統一編號",
    contactName: "聯絡人",
    phone: "電話",
    email: "Email",
    address: "地址",
    serviceSection: "服務項目表頭",
    reimbursementSection: "代墊費用表頭",
    itemName: "項目名稱",
    itemContent: "內容",
    quantity: "數量",
    unitPrice: "單價",
    lineTotal: "總價",
    itemNote: "備註",
    subtotal: "未稅小計",
    tax: "稅額（可用 {rate} 代入稅率）",
    serviceTotal: "服務總計",
    reimbursementTotal: "代墊小計",
    grandTotal: "總計金額",
    bankSection: "收款資訊標題",
    bankCurrency: "幣別",
    bankName: "銀行",
    bankBranch: "分行",
    bankAccountNumber: "帳號",
    bankAccountHolder: "戶名",
    signatureClient: "買方簽章欄",
    signatureProvider: "賣方簽章欄",
    emptyValue: "空值顯示字元",
};

const layoutNumberFields = [
    { key: "pagePadding", name: "頁面留白 (pt)" },
    { key: "baseFontSize", name: "內文字級 (pt)" },
    { key: "titleFontSize", name: "標題字級 (pt)" },
    { key: "logoWidth", name: "Logo 寬 (pt)" },
    { key: "logoHeight", name: "Logo 高 (pt)" },
    { key: "stampWidth", name: "印章寬 (pt)" },
    { key: "stampHeight", name: "印章高 (pt)" },
    { key: "stampRight", name: "印章距右 (pt)" },
    { key: "stampBottom", name: "印章距下 (pt)" },
] as const;

type LayoutNumberKey = (typeof layoutNumberFields)[number]["key"];

const columnFields = [
    { key: "category", name: "類別" },
    { key: "name", name: "項目名稱" },
    { key: "content", name: "內容" },
    { key: "quantity", name: "數量" },
    { key: "price", name: "單價" },
    { key: "total", name: "總價" },
    { key: "note", name: "備註" },
] as const;

type ColumnKey = keyof PdfColumnWidths;

const toggles = [
    { key: "showLogo", name: "顯示 Logo" },
    { key: "showStamp", name: "顯示用印" },
    { key: "showTaxRow", name: "顯示稅額列" },
    { key: "showBankAccounts", name: "顯示收款資訊" },
    { key: "showSignatures", name: "顯示簽章欄" },
] as const;

type ToggleKey = (typeof toggles)[number]["key"];

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

    /** 把畫面上的字串數字轉回設定物件；有非數字時回傳 null 由呼叫端擋下 */
    const buildTemplate = (): PdfTemplate | null => {
        const layout = { ...template.layout };
        for (const f of layoutNumberFields) {
            const n = Number(numbers[f.key]);
            if (!Number.isFinite(n)) return null;
            layout[f.key] = n;
        }
        const columnWidths = { ...template.layout.columnWidths };
        for (const c of columnFields) {
            const n = Number(numbers.columns[c.key]);
            if (!Number.isFinite(n)) return null;
            columnWidths[c.key] = n;
        }
        return { ...template, layout: { ...layout, columnWidths } };
    };

    const handleSave = async () => {
        const payload = buildTemplate();
        if (!payload) {
            toast({ title: "儲存失敗", description: "版面欄位必須是數字", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const result = await savePdfTemplate(payload);
            if (result.success) {
                setTemplate(result.data);
                setNumbers(toDraft(result.data));
                toast({ title: "儲存成功", description: "報價單版型已更新" });
            } else {
                toast({ title: "儲存失敗", description: result.error, variant: "destructive" });
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
                toast({ title: "已還原", description: "版型已回到預設值" });
            } else {
                toast({ title: "還原失敗", description: result.error, variant: "destructive" });
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
            toast({ title: "無法預覽", description: "版面欄位必須是數字", variant: "destructive" });
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
            toast({ title: "預覽失敗", description: "請檢查版面設定", variant: "destructive" });
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
                        報價單版型設定
                    </CardTitle>
                    <CardDescription>
                        自訂報價單 PDF 上的文字、版面與顯示內容。未調整的欄位維持預設樣式。
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        儲存
                    </Button>
                    <Button variant="outline" onClick={handlePreview} disabled={isPreviewing}>
                        {isPreviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                        預覽範例
                    </Button>
                    <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        還原預設值
                    </Button>
                </CardContent>
            </Card>

            {/* 預覽 */}
            {previewUrl && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">範例預覽</CardTitle>
                        <CardDescription>
                            使用虛構的範例帳單產生，反映目前畫面上的設定（不必先儲存）。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <iframe
                            src={previewUrl}
                            title="報價單版型預覽"
                            className="w-full h-[600px] rounded-md border"
                        />
                    </CardContent>
                </Card>
            )}

            {/* 文字標籤 */}
            {pdfLabelGroups.map((group) => (
                <Card key={group.title}>
                    <CardHeader>
                        <CardTitle className="text-base">{group.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        {group.keys.map((key) => (
                            <div key={key} className="space-y-1.5">
                                <Label htmlFor={`label-${key}`}>{labelNames[key]}</Label>
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
                    <CardTitle className="text-base">版面</CardTitle>
                    <CardDescription>單位為 PDF 的點 (pt)，A4 寬約 595pt、高約 842pt。</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="page-size">紙張大小</Label>
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
                            <Label htmlFor={`layout-${f.key}`}>{f.name}</Label>
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
                    <CardTitle className="text-base">品項表格欄寬</CardTitle>
                    <CardDescription>
                        以百分比設定，總和必須等於 100%。目前：
                        <span className={columnSumOk ? "text-foreground" : "text-red-600 dark:text-red-400 font-semibold"}>
                            {" "}{Math.round(columnSum * 100) / 100}%
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                    {columnFields.map((c) => (
                        <div key={c.key} className="space-y-1.5">
                            <Label htmlFor={`col-${c.key}`}>{c.name}</Label>
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
                    <CardTitle className="text-base">顯示內容</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {toggles.map((t) => (
                            <div key={t.key} className="flex items-center gap-2">
                                <Checkbox
                                    id={`toggle-${t.key}`}
                                    checked={template.options[t.key as ToggleKey]}
                                    onCheckedChange={(checked) => setOption(t.key as ToggleKey, checked === true)}
                                />
                                <Label htmlFor={`toggle-${t.key}`} className="font-normal">{t.name}</Label>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="currency-symbol">金額符號</Label>
                            <Input
                                id="currency-symbol"
                                value={template.options.currencySymbol}
                                onChange={(e) => setOption("currencySymbol", e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="date-format">日期格式</Label>
                            <Input
                                id="date-format"
                                value={template.options.dateFormat}
                                placeholder="yyyy/MM/dd"
                                onChange={(e) => setOption("dateFormat", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="footer-note">附註／條款</Label>
                        <Textarea
                            id="footer-note"
                            rows={3}
                            value={template.options.footerNote}
                            placeholder="例如：本報價單有效期 30 天。"
                            onChange={(e) => setOption("footerNote", e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
