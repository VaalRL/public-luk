"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {} from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { createParserTemplate, deleteParserTemplate, getParserTemplates, ParserConfig } from "@/app/actions/parser";
import { BankStatementMapper } from "@/components/bank-statement-mapper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ParserTemplate = {
    id: string;
    name: string;
    config: string;
    createdAt: Date;
};

export function ParserManagement({ initialTemplates }: { initialTemplates: ParserTemplate[] }) {
    const [templates, setTemplates] = useState(initialTemplates);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ParserTemplate | null>(null);
    const [name, setName] = useState("");
    const [alertInfo, setAlertInfo] = useState<{
        open: boolean;
        title: string;
        description: string;
        onConfirm?: () => void;
    }>({
        open: false,
        title: "",
        description: "",
    });

    const handleDelete = async (id: string) => {
        if (confirm("確定要刪除此模板嗎？")) {
            await deleteParserTemplate(id);
            const updatedTemplates = await getParserTemplates();
            setTemplates(updatedTemplates);
        }
    };

    const getColumnLetter = (colIndex: number) => {
        let letter = "";
        while (colIndex >= 0) {
            letter = String.fromCharCode((colIndex % 26) + 65) + letter;
            colIndex = Math.floor(colIndex / 26) - 1;
        }
        return letter;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">銀行明細解析管理</h2>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        新增解析模板
                    </Button>
                )}
            </div>

            {isCreating ? (
                <Card>
                    <CardHeader>
                        <CardTitle>新增解析模板</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>模板名稱</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="例如：中國信託 CSV 解析"
                                />
                            </div>

                            <BankStatementMapper
                                onSave={async (mappings, headerRowIndex) => {
                                    if (!name) {
                                        setAlertInfo({
                                            open: true,
                                            title: "錯誤",
                                            description: "請輸入模板名稱",
                                        });
                                        return;
                                    }

                                    // Transform mappings to ParserConfig
                                    // Mapping is columnIndex -> fieldId
                                    // ParserConfig needs fieldId -> columnIndex
                                    const newConfig: ParserConfig = {
                                        headerRow: headerRowIndex,
                                    };

                                    // Reverse the mapping
                                    Object.entries(mappings).forEach(([colIndex, fieldId]) => {
                                        const col = parseInt(colIndex);
                                        switch (fieldId) {
                                            case 'date': newConfig.dateCol = col; break;
                                            case 'description': newConfig.descriptionCol = col; break;
                                            case 'deposit': newConfig.depositCol = col; break;
                                            case 'withdrawal': newConfig.withdrawalCol = col; break;
                                            case 'balance': newConfig.balanceCol = col; break;
                                            case 'note': newConfig.noteCol = col; break;
                                        }
                                    });

                                    // Validate required fields
                                    if (newConfig.depositCol === undefined && newConfig.withdrawalCol === undefined) {
                                        setAlertInfo({
                                            open: true,
                                            title: "錯誤",
                                            description: "必須設定存入或支出欄位",
                                        });
                                        return;
                                    }

                                    try {
                                        await createParserTemplate({
                                            name,
                                            config: newConfig,
                                        });
                                        const updatedTemplates = await getParserTemplates();
                                        setTemplates(updatedTemplates);
                                        setIsCreating(false);
                                        setAlertInfo({
                                            open: true,
                                            title: "成功",
                                            description: "模板儲存成功",
                                        });
                                    } catch (error) {
                                        console.error(error);
                                        setAlertInfo({
                                            open: true,
                                            title: "錯誤",
                                            description: "儲存失敗",
                                        });
                                    }
                                }}
                            />

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsCreating(false)}>取消</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => {
                        const conf = JSON.parse(template.config) as ParserConfig;
                        return (
                            <Card
                                key={template.id}
                                className="cursor-pointer hover:bg-accent/50 transition-colors"
                                onClick={() => setSelectedTemplate(template)}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {template.name}
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(template.id);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                        <p>日期欄位: {conf.dateCol !== undefined ? getColumnLetter(conf.dateCol) : '-'}</p>
                                        <p>存入金額: {conf.depositCol !== undefined ? getColumnLetter(conf.depositCol) : '-'}</p>
                                        <p>建立時間: {new Date(template.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    {templates.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            尚無解析模板，請點擊右上角新增
                        </div>
                    )}
                </div>
            )}

            <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>模板詳情：{selectedTemplate?.name}</DialogTitle>
                    </DialogHeader>
                    {selectedTemplate && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="font-medium">標題列位置</div>
                                <div>第 {JSON.parse(selectedTemplate.config).headerRow + 1} 列</div>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>欄位名稱</TableHead>
                                            <TableHead>Excel 欄位</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(() => {
                                            const conf = JSON.parse(selectedTemplate.config) as ParserConfig;
                                            const mappings = [
                                                { label: "交易日期", col: conf.dateCol },
                                                { label: "摘要/說明", col: conf.descriptionCol },
                                                { label: "存入金額", col: conf.depositCol },
                                                { label: "支出金額", col: conf.withdrawalCol },
                                                { label: "餘額", col: conf.balanceCol },
                                                { label: "備註", col: conf.noteCol },
                                            ];
                                            return mappings.map((m, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{m.label}</TableCell>
                                                    <TableCell className="font-mono">
                                                        {m.col !== undefined ? (
                                                            <Badge variant="outline">{getColumnLetter(m.col)} 欄</Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ));
                                        })()}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={alertInfo.open} onOpenChange={(open) => {
                if (!open) {
                    setAlertInfo(prev => ({ ...prev, open: false }));
                    if (alertInfo.onConfirm) {
                        alertInfo.onConfirm();
                    }
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{alertInfo.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {alertInfo.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => {
                            setAlertInfo(prev => ({ ...prev, open: false }));
                            if (alertInfo.onConfirm) {
                                alertInfo.onConfirm();
                            }
                        }}>
                            確定
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
