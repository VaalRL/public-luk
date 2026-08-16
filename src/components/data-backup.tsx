"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2, AlertTriangle } from "lucide-react";
import { importData } from "@/app/actions/backup";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
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

export function DataBackup() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // Use fetch to get the data first, then trigger download client-side
            // This forces the filename via the 'download' attribute, which helps with
            // browsers that might ignore Content-Disposition headers (like some dev/automation browsers)
            const response = await fetch("/api/backup/export");
            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "匯出成功",
                description: "系統資料已成功匯出",
            });
        } catch (error) {
            console.error("Export failed:", error);
            toast({
                title: "匯出失敗",
                description: "請稍後再試",
                variant: "destructive",
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPendingFile(file);
        setShowConfirmDialog(true);
    };

    const handleConfirmImport = async () => {
        if (!pendingFile) return;
        setShowConfirmDialog(false);

        try {
            setIsImporting(true);
            const text = await pendingFile.text();
            const data = JSON.parse(text);

            await importData(data);

            toast({
                title: "匯入成功",
                description: "系統將重新整理以套用變更",
            });

            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error("Import failed:", error);
            toast({
                title: "匯入失敗",
                description: "資料格式錯誤或系統異常",
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
            setPendingFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleCancelImport = () => {
        setShowConfirmDialog(false);
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>資料備份與還原</CardTitle>
                    <CardDescription>
                        匯出系統完整資料以進行備份，或從備份檔還原資料。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>注意</AlertTitle>
                        <AlertDescription>
                            匯入功能將會<span className="font-bold">完全覆蓋</span>目前的系統資料，請謹慎使用。建議在匯入前先執行匯出備份。
                        </AlertDescription>
                    </Alert>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                            onClick={handleExport}
                            disabled={isExporting || isImporting}
                            className="flex-1"
                        >
                            {isExporting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            匯出系統資料
                        </Button>

                        <div className="flex-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isExporting || isImporting}
                                className="w-full"
                            >
                                {isImporting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                匯入還原資料
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確認還原資料？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作將會<span className="font-bold text-destructive">清除並覆蓋</span>目前系統中的所有資料！
                            <br />
                            建議您在執行此操作前先備份目前的資料。
                            <br />
                            <br />
                            確定要繼續嗎？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelImport}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmImport} className="bg-destructive hover:bg-destructive/90">
                            確認還原
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
