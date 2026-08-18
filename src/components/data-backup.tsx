"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2, AlertTriangle } from "lucide-react";
import { importData } from "@/app/actions/backup";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n/context";
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
    const t = useT();

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
                title: t("backup.exported"),
                description: t("backup.exportedDescription"),
            });
        } catch (error) {
            console.error("Export failed:", error);
            toast({
                title: t("backup.exportFailed"),
                description: t("common.retryLater"),
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
                title: t("backup.imported"),
                description: t("backup.importedDescription"),
            });

            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error("Import failed:", error);
            toast({
                title: t("backup.importFailed"),
                description: t("backup.importFailedDescription"),
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
                    <CardTitle>{t("backup.title")}</CardTitle>
                    <CardDescription>
                        {t("backup.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{t("backup.warningTitle")}</AlertTitle>
                        <AlertDescription>
                            {t("backup.warningBefore")}<span className="font-bold">{t("backup.warningStrong")}</span>{t("backup.warningAfter")}
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
                            {t("backup.exportButton")}
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
                                {t("backup.importButton")}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("backup.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("backup.confirmBefore")}<span className="font-bold text-destructive">{t("backup.confirmClear")}</span>{t("backup.confirmAfter")}
                            <br />
                            {t("backup.confirmBackupFirst")}
                            <br />
                            <br />
                            {t("backup.confirmContinue")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelImport}>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmImport} className="bg-destructive hover:bg-destructive/90">
                            {t("backup.confirmRestore")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
