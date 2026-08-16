"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
    deleteAllInvoices,
    deleteAllTransactions,
    deleteAllCompanies,
    deleteAllData
} from "@/app/actions/danger-zone";
import { useToast } from "@/hooks/use-toast";

type DeleteModule = "invoices" | "transactions" | "companies" | "all" | null;

import { useHiddenMode } from "@/store/use-hidden-mode";
import { Music } from "lucide-react";

export function DangerZone() {
    const { toast } = useToast();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [moduleToDelete, setModuleToDelete] = useState<DeleteModule>(null);
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const enableHiddenMode = useHiddenMode((state) => state.enable);
    const isHiddenModeEnabled = useHiddenMode((state) => state.isEnabled);

    const modules = [
        {
            id: "invoices" as const,
            name: "帳單資料",
            description: "刪除所有帳單、帳單項目和提醒事項",
            confirmWord: "DELETE INVOICES",
            color: "orange",
        },
        {
            id: "transactions" as const,
            name: "銀行交易資料",
            description: "刪除所有銀行明細和交易記錄",
            confirmWord: "DELETE TRANSACTIONS",
            color: "orange",
        },
        {
            id: "companies" as const,
            name: "公司資料",
            description: "刪除所有公司和銀行帳號資訊（會同時刪除相關帳單）",
            confirmWord: "DELETE COMPANIES",
            color: "red",
        },
        {
            id: "all" as const,
            name: "全站資料",
            description: "⚠️ 刪除所有資料，包括公司、帳單、交易記錄等",
            confirmWord: "DELETE EVERYTHING",
            color: "red",
        },
    ];

    const handleDeleteClick = (moduleId: DeleteModule) => {
        setModuleToDelete(moduleId);
        setConfirmText("");
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!moduleToDelete) return;

        const selectedModule = modules.find(m => m.id === moduleToDelete);
        if (!selectedModule || confirmText !== selectedModule.confirmWord) {
            return;
        }

        try {
            setIsDeleting(true);

            let result;
            switch (moduleToDelete) {
                case "invoices":
                    result = await deleteAllInvoices();
                    break;
                case "transactions":
                    result = await deleteAllTransactions();
                    break;
                case "companies":
                    result = await deleteAllCompanies();
                    break;
                case "all":
                    result = await deleteAllData();
                    break;
            }

            // 刪除動作現在回傳 ActionResult，失敗時不能再當成成功
            if (result && !result.success) {
                toast({
                    title: "刪除失敗",
                    description: result.error || "刪除失敗，請稍後再試",
                    variant: "destructive",
                });
                return;
            }

            setDeleteDialogOpen(false);
            setModuleToDelete(null);
            setConfirmText("");

            // Show success message
            toast({
                title: "刪除成功",
                description: `成功刪除${selectedModule.name}`,
            });
            window.location.reload();
        } catch (error) {
            console.error("刪除失敗:", error);
            toast({
                title: "刪除失敗",
                description: "刪除失敗，請稍後再試",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    // Secret unlock handler
    const handleSecretUnlock = () => {
        enableHiddenMode();
        setDeleteDialogOpen(false);
        setModuleToDelete(null);
        setConfirmText("");
        toast({
            title: "Access Granted",
            description: "Hidden modules unlocked until application close.",
        });
    };

    const currentModule = modules.find(m => m.id === moduleToDelete);
    const isConfirmValid = currentModule && confirmText === currentModule.confirmWord;

    // Check for secret phrase
    const SECRET_PHRASE = "Faces look ugly when you're alone.";
    const showSecretButton = moduleToDelete === "all" && confirmText === SECRET_PHRASE && !isHiddenModeEnabled;

    return (
        <div className="space-y-6">
            <Card className="border-2 border-red-500/50 bg-red-500/5 dark:border-red-400/50 dark:bg-red-400/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        危險區域
                    </CardTitle>
                    <CardDescription className="text-red-600 dark:text-red-400">
                        此區域的操作將永久刪除資料，無法復原。請謹慎操作。
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4">
                {modules.map((module) => (
                    <Card
                        key={module.id}
                        className={`border-2 ${module.color === "red"
                            ? "border-red-500/30 dark:border-red-400/30"
                            : "border-orange-500/30 dark:border-orange-400/30"
                            }`}
                    >
                        <CardHeader>
                            <CardTitle className="text-lg">{module.name}</CardTitle>
                            <CardDescription>{module.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="destructive"
                                onClick={() => handleDeleteClick(module.id)}
                                className="w-full sm:w-auto"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                刪除{module.name}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-5 h-5" />
                            確認刪除 - {currentModule?.name}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild className="space-y-4">
                            <div className="text-muted-foreground text-sm">
                                <p className="text-red-600 dark:text-red-400 font-semibold">
                                    ⚠️ 此操作無法復原！
                                </p>
                                <p>{currentModule?.description}</p>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-text">
                                        請輸入 <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{currentModule?.confirmWord}</code> 以確認：
                                    </Label>
                                    <Input
                                        id="confirm-text"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder={currentModule?.confirmWord}
                                        className="font-mono"
                                        disabled={isDeleting}
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>

                        {showSecretButton ? (
                            <Button
                                onClick={handleSecretUnlock}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Music className="w-4 h-4 mr-2" />
                                People Are Strange
                            </Button>
                        ) : (
                            <AlertDialogAction
                                onClick={handleConfirmDelete}
                                disabled={!isConfirmValid || isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeleting ? "刪除中..." : "確定刪除"}
                            </AlertDialogAction>
                        )}

                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
