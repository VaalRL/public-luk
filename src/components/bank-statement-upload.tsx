"use client";

import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { createBankStatement, createTransactionsBatch } from "@/app/actions/reconciliation";
import { getParserTemplates, ParserConfig } from "@/app/actions/parser";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n/context";
import type { CellValue } from "@/types/spreadsheet";

type ParsedTransaction = {
    date: Date;
    description?: string;
    withdrawal: number;
    deposit: number;
    balance?: number;
    note?: string;
};

type ParserTemplate = {
    id: string;
    name: string;
    config: string;
};

export function BankStatementUpload({ onUploadComplete }: { onUploadComplete: () => void }) {
    const { toast } = useToast();
    const t = useT();
    const [isUploading, setIsUploading] = useState(false);
    const [templates, setTemplates] = useState<ParserTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const data = await getParserTemplates();
                setTemplates(data);
                if (data.length > 0) {
                    setSelectedTemplateId(data[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch parser templates:", error);
            }
        };
        fetchTemplates();
    }, []);

    const parseExcelFile = async (file: File): Promise<ParsedTransaction[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: "array" });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as CellValue[][];

                    // Get selected template config
                    const template = templates.find(t => t.id === selectedTemplateId);
                    if (!template) {
                        throw new Error(t("reconciliation.upload.templateRequired"));
                    }
                    const config = JSON.parse(template.config) as ParserConfig;

                    // Parse data starting from the row after header
                    const transactions: ParsedTransaction[] = [];
                    const headerIndex = config.headerRow;

                    for (let i = headerIndex + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0) continue;

                        // Handle number parsing (remove commas)
                        const parseNumber = (val: CellValue) => {
                            if (typeof val === 'number') return val;
                            if (typeof val === 'string') {
                                return parseFloat(val.replace(/,/g, '')) || 0;
                            }
                            return 0;
                        };

                        const dateVal = config.dateCol !== undefined ? row[config.dateCol] : undefined;
                        let parsedDate = new Date();
                        if (dateVal) {
                            // Try parsing different date formats
                            // Excel serial date
                            if (typeof dateVal === 'number') {
                                parsedDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                            } else {
                                const d = new Date(dateVal as string | number | Date);
                                if (!isNaN(d.getTime())) {
                                    parsedDate = d;
                                }
                            }
                        }

                        const transaction: ParsedTransaction = {
                            date: parsedDate,
                            description: config.descriptionCol !== undefined ? row[config.descriptionCol]?.toString() || "" : "",
                            withdrawal: config.withdrawalCol !== undefined ? parseNumber(row[config.withdrawalCol]) : 0,
                            deposit: config.depositCol !== undefined ? parseNumber(row[config.depositCol]) : 0,
                            balance: config.balanceCol !== undefined ? parseNumber(row[config.balanceCol]) : 0,
                            note: config.noteCol !== undefined ? row[config.noteCol]?.toString() || "" : "",
                        };

                        // Skip empty rows or invalid transactions
                        if (!transaction.date || (transaction.withdrawal === 0 && transaction.deposit === 0)) {
                            continue;
                        }

                        transactions.push(transaction);
                    }

                    resolve(transactions);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!selectedTemplateId) {
            toast({
                title: t("reconciliation.upload.templateRequired"),
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);

        try {
            // Check if running in Electron
            const isElectron = typeof window !== 'undefined' &&
                              (window as { electron?: unknown }).electron !== undefined;
            console.log(`Environment: ${isElectron ? 'Electron' : 'Browser'}`);
            console.log(`解析檔案中... 檔案名稱: ${file.name}, 大小: ${file.size} bytes`);

            // Parse the Excel file
            const transactions = await parseExcelFile(file);

            if (transactions.length === 0) {
                throw new Error(t("reconciliation.upload.noTransactions"));
            }

            console.log(`解析完成，共 ${transactions.length} 筆交易`);
            console.log("創建銀行明細記錄...");

            // Create bank statement record
            const statement = await createBankStatement(file.name);
            console.log(`銀行明細記錄已創建，ID: ${statement.id}`);

            console.log("批量創建交易記錄...");
            // Create transaction records
            await createTransactionsBatch({
                bankStatementId: statement.id,
                transactions,
            });
            console.log("交易記錄創建完成");

            toast({
                title: t("reconciliation.upload.uploadSuccess"),
                description: t("reconciliation.upload.imported", { n: transactions.length }),
            });

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            // Notify parent to refresh
            setTimeout(() => {
                console.log("觸發頁面重新載入...");
                onUploadComplete();
            }, 500);
        } catch (error: unknown) {
            console.error("上傳失敗，詳細錯誤:", error);
            console.error("錯誤堆疊:", error instanceof Error ? error.stack : undefined);

            const rawMessage = error instanceof Error ? error.message : String(error);
            let errorMessage = rawMessage || t("reconciliation.upload.unknownError");

            // Provide more specific error messages
            if (rawMessage.includes("fetch")) {
                errorMessage = t("reconciliation.upload.networkError");
            } else if (rawMessage.includes("database")) {
                errorMessage = t("reconciliation.upload.databaseError");
            } else if (rawMessage.includes("parse")) {
                errorMessage = t("reconciliation.upload.parseError");
            }

            toast({
                title: t("reconciliation.upload.uploadFailed"),
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex justify-end gap-2 items-center">
            <div className="w-[200px]">
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                        <SelectValue placeholder={t("reconciliation.upload.selectTemplate")} />
                    </SelectTrigger>
                    <SelectContent>
                        {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                                {t.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
            />
            <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !selectedTemplateId}
                variant="default"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("reconciliation.upload.processing")}
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        {t("reconciliation.upload.uploadButton")}
                    </>
                )}
            </Button>
        </div>
    );
}
