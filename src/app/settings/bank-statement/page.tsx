import { BankStatementMapper } from "@/components/bank-statement-mapper";

export default function BankStatementDefinitionPage() {
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">銀行明細欄位定義 (POC)</h1>
            <p className="text-muted-foreground mb-8">
                請上傳您的銀行明細 Excel 檔案，並透過拖拉方式定義各欄位的意義。
            </p>
            <BankStatementMapper />
        </div>
    );
}
