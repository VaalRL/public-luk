"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
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
    const t = useT();
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
        if (confirm(t("parser.deleteConfirm"))) {
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
                <h2 className="text-2xl font-bold tracking-tight">{t("parser.title")}</h2>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("parser.add")}
                    </Button>
                )}
            </div>

            {isCreating ? (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("parser.add")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>{t("parser.templateName")}</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t("parser.templateNamePlaceholder")}
                                />
                            </div>

                            <BankStatementMapper
                                onSave={async (mappings, headerRowIndex) => {
                                    if (!name) {
                                        setAlertInfo({
                                            open: true,
                                            title: t("common.saveFailed"),
                                            description: t("parser.nameRequired"),
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
                                            title: t("common.saveFailed"),
                                            description: t("parser.columnRequired"),
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
                                            title: t("common.saveSuccess"),
                                            description: t("parser.saved"),
                                        });
                                    } catch (error) {
                                        console.error(error);
                                        setAlertInfo({
                                            open: true,
                                            title: t("common.saveFailed"),
                                            description: t("parser.saveFailed"),
                                        });
                                    }
                                }}
                            />

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsCreating(false)}>{t("common.cancel")}</Button>
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
                                        <p>{t("parser.dateColumn")}: {conf.dateCol !== undefined ? getColumnLetter(conf.dateCol) : '-'}</p>
                                        <p>{t("parser.depositColumn")}: {conf.depositCol !== undefined ? getColumnLetter(conf.depositCol) : '-'}</p>
                                        <p>{t("parser.createdAt")}: {new Date(template.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    {templates.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            {t("parser.empty")}
                        </div>
                    )}
                </div>
            )}

            <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("parser.detailTitle")}：{selectedTemplate?.name}</DialogTitle>
                    </DialogHeader>
                    {selectedTemplate && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="font-medium">{t("parser.headerRow")}</div>
                                <div>{t("parser.rowN", { n: JSON.parse(selectedTemplate.config).headerRow + 1 })}</div>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("parser.fieldName")}</TableHead>
                                            <TableHead>{t("parser.excelColumn")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(() => {
                                            const conf = JSON.parse(selectedTemplate.config) as ParserConfig;
                                            const mappings = [
                                                { label: t("parser.fieldDate"), col: conf.dateCol },
                                                { label: t("parser.fieldDescription"), col: conf.descriptionCol },
                                                { label: t("parser.fieldDeposit"), col: conf.depositCol },
                                                { label: t("parser.fieldWithdrawal"), col: conf.withdrawalCol },
                                                { label: t("parser.fieldBalance"), col: conf.balanceCol },
                                                { label: t("parser.fieldNote"), col: conf.noteCol },
                                            ];
                                            return mappings.map((m, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{m.label}</TableCell>
                                                    <TableCell className="font-mono">
                                                        {m.col !== undefined ? (
                                                            <Badge variant="outline">{t("parser.columnLetter", { letter: getColumnLetter(m.col) })}</Badge>
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
                            {t("parser.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
