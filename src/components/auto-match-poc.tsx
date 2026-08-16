"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
} from "@/components/ui/table";
import { ArrowRight, CheckCircle2, AlertCircle, Plus, Trash2, AlertTriangle } from "lucide-react";

type Company = {
    id: string;
    name: string;
    bankAccounts: string[];
};

type Invoice = {
    id: string;
    companyId: string;
    date: string;
    amount: number;
    status: "unpaid" | "partial" | "paid";
    paidAmount: number;
};

type Transaction = {
    id: string;
    date: string;
    note: string;
    amount: number;
};

type MatchResult = {
    groupId: string;
    companyNames: string;
    sourceAccounts: string[];
    totalDeposit: number;
    totalAR: number;
    matches: {
        invoiceId: string;
        allocatedAmount: number;
    }[];
    remainingSurplus: number;
    remainingUnpaid: number;
};

const DEFAULT_COMPANIES: Company[] = [
    { id: "c1", name: "Tech Corp", bankAccounts: ["12345", "88888"] },
    { id: "c2", name: "Design Studio", bankAccounts: ["67890", "88888"] },
    { id: "c3", name: "Consulting Inc", bankAccounts: ["54321"] },
];

const DEFAULT_INVOICES: Invoice[] = [
    { id: "inv1", companyId: "c1", date: "2023-10-01", amount: 10000, status: "unpaid", paidAmount: 0 },
    { id: "inv2", companyId: "c1", date: "2023-10-15", amount: 5000, status: "unpaid", paidAmount: 0 },
    { id: "inv3", companyId: "c2", date: "2023-10-05", amount: 20000, status: "unpaid", paidAmount: 0 },
    { id: "inv4", companyId: "c3", date: "2023-10-20", amount: 8000, status: "unpaid", paidAmount: 0 },
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
    { id: "tx1", date: "2023-10-25", note: "ATM轉帳 12345", amount: 12000 },
    { id: "tx2", date: "2023-10-26", note: "匯款 67890", amount: 5000 },
    { id: "tx3", date: "2023-10-27", note: "共用帳號 88888", amount: 15000 },
    { id: "tx4", date: "2023-10-28", note: "未知來源 11111", amount: 5000 },
];

export function AutoMatchPoc() {
    const [companies, setCompanies] = useState<Company[]>(DEFAULT_COMPANIES);
    const [invoices, setInvoices] = useState<Invoice[]>(DEFAULT_INVOICES);
    const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_TRANSACTIONS);
    const [results, setResults] = useState<MatchResult[]>([]);
    const [ambiguousTransactions, setAmbiguousTransactions] = useState<Transaction[]>([]);

    // Company Management
    const addCompany = () => {
        const newId = `c${companies.length + 1}`;
        setCompanies([...companies, { id: newId, name: "", bankAccounts: [] }]);
    };

    const updateCompany = (id: string, field: keyof Company, value: Company[keyof Company]) => {
        setCompanies(companies.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const deleteCompany = (id: string) => {
        setCompanies(companies.filter(c => c.id !== id));
        setInvoices(invoices.filter(inv => inv.companyId !== id));
    };

    // Invoice Management
    const addInvoice = () => {
        const newId = `inv${invoices.length + 1}`;
        setInvoices([...invoices, {
            id: newId,
            companyId: companies[0]?.id || "",
            date: "2023-10-01",
            amount: 0,
            status: "unpaid",
            paidAmount: 0
        }]);
    };

    const updateInvoice = (id: string, field: keyof Invoice, value: Invoice[keyof Invoice]) => {
        setInvoices(invoices.map(inv => inv.id === id ? { ...inv, [field]: value } : inv));
    };

    const deleteInvoice = (id: string) => {
        setInvoices(invoices.filter(inv => inv.id !== id));
    };

    // Transaction Management
    const addTransaction = () => {
        const newId = `tx${transactions.length + 1}`;
        setTransactions([...transactions, {
            id: newId,
            date: "2023-10-01",
            note: "",
            amount: 0
        }]);
    };

    const updateTransaction = (id: string, field: keyof Transaction, value: Transaction[keyof Transaction]) => {
        setTransactions(transactions.map(tx => tx.id === id ? { ...tx, [field]: value } : tx));
    };

    const deleteTransaction = (id: string) => {
        setTransactions(transactions.filter(tx => tx.id !== id));
    };

    const runAutoMatch = () => {
        const newResults: MatchResult[] = [];
        const currentInvoices = JSON.parse(JSON.stringify(invoices)) as Invoice[];
        const newAmbiguousTransactions: Transaction[] = [];

        // 1. Group Transactions by Last 5 Digits
        const accountGroups = new Map<string, {
            last5: string;
            totalDeposit: number;
            transactions: Transaction[];
        }>();

        transactions.forEach((tx) => {
            const last5Match = tx.note.match(/\d{5}/);
            if (last5Match) {
                const last5 = last5Match[0];
                if (!accountGroups.has(last5)) {
                    accountGroups.set(last5, {
                        last5,
                        totalDeposit: 0,
                        transactions: [],
                    });
                }
                const group = accountGroups.get(last5)!;
                group.transactions.push(tx);
                group.totalDeposit += tx.amount;
            }
        });

        // 2. Map Accounts to Companies
        const accountToCompanies = new Map<string, Set<string>>();
        const companyMap = new Map<string, Company>();

        companies.forEach(c => {
            companyMap.set(c.id, c);
            c.bankAccounts.forEach(acc => {
                if (!accountToCompanies.has(acc)) {
                    accountToCompanies.set(acc, new Set());
                }
                accountToCompanies.get(acc)!.add(c.id);
            });
        });

        // 3. Process each account group
        const processedCompanies = new Set<string>();

        accountGroups.forEach((group) => {
            const companyIds = accountToCompanies.get(group.last5);

            // Check if this account is shared by multiple companies
            if (!companyIds || companyIds.size === 0) {
                // Unknown account - skip for now
                return;
            }

            if (companyIds.size > 1) {
                // Ambiguous account - mark for manual review
                newAmbiguousTransactions.push(...group.transactions);
                return;
            }

            // Single company - process normally
            const companyId = Array.from(companyIds)[0];

            if (processedCompanies.has(companyId)) {
                // Already processed this company
                return;
            }

            processedCompanies.add(companyId);
            const company = companyMap.get(companyId)!;

            // Get all transactions for this company (from all their accounts)
            const companyTransactions: Transaction[] = [];
            let totalDeposit = 0;

            company.bankAccounts.forEach(acc => {
                const accGroup = accountGroups.get(acc);
                if (accGroup) {
                    const accCompanies = accountToCompanies.get(acc);
                    // Only include if this account is not shared
                    if (accCompanies && accCompanies.size === 1) {
                        companyTransactions.push(...accGroup.transactions);
                        totalDeposit += accGroup.totalDeposit;
                    }
                }
            });

            if (companyTransactions.length === 0 && totalDeposit === 0) {
                // No transactions for this company
                return;
            }

            // Get invoices for this company
            const companyInvoices = currentInvoices
                .filter((inv) => inv.companyId === companyId && inv.status !== "paid")
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const totalAR = companyInvoices.reduce((sum, inv) => sum + (inv.amount - inv.paidAmount), 0);

            // Match transactions to invoices (FIFO)
            const matches: { invoiceId: string; allocatedAmount: number }[] = [];
            let remainingPool = totalDeposit;

            for (const invoice of companyInvoices) {
                if (remainingPool <= 0) break;

                const invoiceOutstanding = invoice.amount - invoice.paidAmount;
                const allocate = Math.min(remainingPool, invoiceOutstanding);

                if (allocate > 0) {
                    matches.push({ invoiceId: invoice.id, allocatedAmount: allocate });
                    invoice.paidAmount += allocate;
                    remainingPool -= allocate;

                    if (invoice.paidAmount >= invoice.amount) {
                        invoice.status = "paid";
                    } else {
                        invoice.status = "partial";
                    }
                }
            }

            newResults.push({
                groupId: companyId,
                companyNames: company.name,
                sourceAccounts: company.bankAccounts.filter(acc => {
                    const accCompanies = accountToCompanies.get(acc);
                    return accCompanies && accCompanies.size === 1 && accountGroups.has(acc);
                }),
                totalDeposit: totalDeposit,
                totalAR: totalAR,
                matches,
                remainingSurplus: Math.max(0, totalDeposit - totalAR),
                remainingUnpaid: Math.max(0, totalAR - totalDeposit),
            });
        });

        // Add companies with invoices but no transactions
        companies.forEach(c => {
            if (!processedCompanies.has(c.id)) {
                const companyInvoices = currentInvoices
                    .filter((inv) => inv.companyId === c.id && inv.status !== "paid");

                const totalAR = companyInvoices.reduce((sum, inv) => sum + (inv.amount - inv.paidAmount), 0);

                if (totalAR > 0) {
                    newResults.push({
                        groupId: c.id,
                        companyNames: c.name,
                        sourceAccounts: [],
                        totalDeposit: 0,
                        totalAR: totalAR,
                        matches: [],
                        remainingSurplus: 0,
                        remainingUnpaid: totalAR,
                    });
                }
            }
        });

        setResults(newResults);
        setAmbiguousTransactions(newAmbiguousTransactions);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
                {/* Companies Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>公司設定</CardTitle>
                        <Button onClick={addCompany} size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-1" /> 新增
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {companies.map((company) => (
                            <div key={company.id} className="p-3 border rounded-lg space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="公司名稱"
                                        value={company.name}
                                        onChange={(e) => updateCompany(company.id, 'name', e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={() => deleteCompany(company.id)}
                                        size="sm"
                                        variant="destructive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Input
                                    placeholder="銀行帳號後五碼 (逗號分隔，例如: 12345,67890)"
                                    value={company.bankAccounts.join(",")}
                                    onChange={(e) => updateCompany(company.id, 'bankAccounts', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Invoices Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>應收帳款</CardTitle>
                        <Button onClick={addInvoice} size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-1" /> 新增
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                        {invoices.map((invoice) => (
                            <div key={invoice.id} className="p-3 border rounded-lg space-y-2">
                                <div className="flex gap-2 items-center">
                                    <span className="text-sm font-mono text-muted-foreground">{invoice.id}</span>
                                    <select
                                        value={invoice.companyId}
                                        onChange={(e) => updateInvoice(invoice.id, 'companyId', e.target.value)}
                                        className="flex-1 border rounded px-2 py-1 text-sm"
                                    >
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name || c.id}</option>
                                        ))}
                                    </select>
                                    <Button
                                        onClick={() => deleteInvoice(invoice.id)}
                                        size="sm"
                                        variant="destructive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="date"
                                        value={invoice.date}
                                        onChange={(e) => updateInvoice(invoice.id, 'date', e.target.value)}
                                    />
                                    <Input
                                        type="number"
                                        placeholder="金額"
                                        value={invoice.amount}
                                        onChange={(e) => updateInvoice(invoice.id, 'amount', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>銀行明細</CardTitle>
                    <Button onClick={addTransaction} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" /> 新增
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                    {transactions.map((tx) => (
                        <div key={tx.id} className="p-3 border rounded-lg">
                            <div className="grid grid-cols-12 gap-2 items-center">
                                <span className="col-span-1 text-sm font-mono text-muted-foreground">{tx.id}</span>
                                <Input
                                    type="date"
                                    value={tx.date}
                                    onChange={(e) => updateTransaction(tx.id, 'date', e.target.value)}
                                    className="col-span-3"
                                />
                                <Input
                                    placeholder="摘要 (需包含後五碼)"
                                    value={tx.note}
                                    onChange={(e) => updateTransaction(tx.id, 'note', e.target.value)}
                                    className="col-span-5"
                                />
                                <Input
                                    type="number"
                                    placeholder="金額"
                                    value={tx.amount}
                                    onChange={(e) => updateTransaction(tx.id, 'amount', parseFloat(e.target.value) || 0)}
                                    className="col-span-2"
                                />
                                <Button
                                    onClick={() => deleteTransaction(tx.id)}
                                    size="sm"
                                    variant="destructive"
                                    className="col-span-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Action Button */}
            <Card>
                <CardContent className="pt-6">
                    <Button onClick={runAutoMatch} size="lg" className="w-full">
                        執行自動對帳 (Run Auto-Match)
                    </Button>
                </CardContent>
            </Card>

            {/* Ambiguous Transactions Warning */}
            {ambiguousTransactions.length > 0 && (
                <Card className="border-orange-500/50 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                            <AlertTriangle className="w-5 h-5" />
                            需要人工審核的交易（共用帳號）
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {ambiguousTransactions.map((tx) => (
                                <div key={tx.id} className="flex justify-between items-center p-3 bg-white rounded border border-orange-200">
                                    <div>
                                        <span className="font-mono text-sm font-medium">{tx.id}</span>
                                        <span className="mx-2 text-muted-foreground">|</span>
                                        <span className="text-sm">{tx.note}</span>
                                    </div>
                                    <span className="font-mono font-medium">${tx.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-orange-700 mt-4">
                            ⚠️ 這些交易的帳號被多個公司共用，無法自動判斷歸屬，請人工確認後手動處理。
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {results.length > 0 && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle>對帳結果</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {results.map((res) => (
                                <div key={res.groupId} className="bg-background p-4 rounded-lg border shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="font-bold flex items-center gap-2 text-lg">
                                                {res.companyNames}
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                {res.sourceAccounts.length > 0 && (
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                                            來源帳號: {res.sourceAccounts.join(", ")}
                                                        </span>
                                                    </div>
                                                )}
                                                總進帳: <span className="font-mono text-foreground font-medium">${res.totalDeposit.toLocaleString()}</span>
                                                <span className="mx-2">|</span>
                                                總應收: <span className="font-mono text-foreground font-medium">${res.totalAR.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {res.remainingUnpaid === 0 && res.totalAR > 0 ? (
                                                <Badge variant="outline" className="text-green-600 border-green-600 mb-1">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> 完全沖銷
                                                </Badge>
                                            ) : res.remainingUnpaid > 0 ? (
                                                <Badge variant="outline" className="text-amber-600 border-amber-600 mb-1">
                                                    <AlertCircle className="w-3 h-3 mr-1" /> 未結餘額: ${res.remainingUnpaid.toLocaleString()}
                                                </Badge>
                                            ) : null}
                                            {res.remainingSurplus > 0 && (
                                                <div className="text-xs text-blue-600 font-medium">
                                                    溢收款: ${res.remainingSurplus.toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                            <span>沖銷明細</span>
                                            <span>金額</span>
                                        </div>
                                        {res.matches.length > 0 ? (
                                            <div className="pl-4 border-l-2 border-muted space-y-2">
                                                {res.matches.map((m) => (
                                                    <div key={m.invoiceId} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                                            <span>帳單 {m.invoiceId}</span>
                                                        </div>
                                                        <span className="font-mono font-medium">
                                                            -${m.allocatedAmount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-muted-foreground italic pl-4">
                                                無匹配帳單
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
