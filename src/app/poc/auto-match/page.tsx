"use client";

import { AutoMatchPoc } from "@/components/auto-match-poc";

export default function AutoMatchPage() {
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">自動對帳邏輯驗證 (POC)</h1>
            <p className="text-muted-foreground mb-8">
                此頁面展示自動對帳的核心演算法：依據銀行明細的「後五碼」識別公司，並採用「先進先出 (FIFO)」原則自動沖銷該公司的未結帳單。
            </p>
            <AutoMatchPoc />
        </div>
    );
}
