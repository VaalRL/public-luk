"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Check,
} from "lucide-react";
import { useReconciliation } from "@/hooks/use-reconciliation";
import {
    TransactionList,
    InvoiceList,
    ReconciliationSummary,
    ReconciliationActions,
    SnapshotDialog,
    AmbiguousTransactions,
    type Transaction,
    type Invoice,
    type Overpayment,
    type NotificationTemplate,
} from "@/components/features/reconciliation";

export function ReconciliationInterface({
    transactions: initialTransactions,
    invoices: initialInvoices,
    notificationTemplates = [],
    overpayments = [],
}: {
    transactions: Transaction[];
    invoices: Invoice[];
    notificationTemplates?: NotificationTemplate[];
    overpayments?: Overpayment[];
}) {
    // Get initial tab from URL hash
    const t = useT();
    const [activeTab, setActiveTab] = React.useState<string>(() => {
        if (typeof window !== 'undefined') {
            const hash = window.location.hash.slice(1);
            return hash === 'summary' ? 'summary' : 'work';
        }
        return 'work';
    });

    const { state, actions } = useReconciliation({
        initialTransactions,
        initialInvoices,
    });

    const {
        transactions,
        invoices,
        isMatching,
        isEditing,
        editValues,
        selectedTx,
        snapshotMonth,
        markedInvoiceIds,
        isTransactionsOpen,
        isInvoicesOpen,
        activeDialog,
        dialogData,
    } = state;

    const {
        setSelectedTx,
        setSnapshotMonth,
        setIsTransactionsOpen,
        setIsInvoicesOpen,
        toggleInvoiceMark,
        handleAutoMatch,
        handleClear,
        handleConfirmDelete,
        handleEditToggle,
        handleSave,
        handleOpenSnapshotDialog,
        handleConfirmSaveSnapshot,
        handleInputChange,
        closeDialog,
    } = actions;

    // Dialog states
    const isSnapshotDialogOpen = activeDialog === 'snapshot';
    const deleteConfirmDialog = activeDialog === 'delete-confirm';
    // dialogData 的形狀依 dialogId 而定，取用時需要窄化成字串
    const asText = (value: unknown) => (typeof value === 'string' ? value : '');
    const notificationDialog = {
        open: activeDialog === 'notification',
        title: asText(dialogData?.title),
        description: asText(dialogData?.message),
    };

    const getTransactionStatus = React.useCallback((tx: Transaction) => {
        if (tx.status === "matched") {
            return (
                <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {t("reconciliation.ui.settled")}
                </Badge>
            );
        }
        if (tx.status === "ambiguous") {
            return (
                <Badge
                    variant="outline"
                    className="bg-orange-50 text-orange-700 border-orange-200"
                >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {t("reconciliation.ui.needsReview")}
                </Badge>
            );
        }
        return <Badge variant="secondary">{t("reconciliation.ui.unsettled")}</Badge>;
        // t 會隨語言改變，必須列入相依，否則切語言後這幾個徽章仍是舊語言
    }, [t]);

    const getMatchedInvoices = React.useCallback((tx: Transaction) => {
        if (!tx.reconciliations || tx.reconciliations.length === 0) return null;

        return (
            <div className="flex flex-col gap-1">
                {tx.reconciliations.map((rec) => (
                    <div key={rec.id} className="text-sm flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-600" />
                        <span>
                            {rec.invoice?.company?.name || t("reconciliation.ui.unknownCompany")} - {rec.invoice?.invoiceNumber || "-"}
                        </span>
                        <span className="text-muted-foreground">
                            (${rec.amount.toLocaleString()})
                        </span>
                    </div>
                ))}
            </div>
        );
        // 同上：t 會隨語言改變
    }, [t]);

    // Filter invoices for display
    // Filter invoices for display
    const workInvoices = React.useMemo(() => invoices.filter((inv) => inv.status !== "paid"), [invoices]);
    const paidInvoices = React.useMemo(() => invoices.filter((inv) => inv.status === "paid"), [invoices]);
    // Requirement 1: Partial payments should be considered "Unpaid" (Open), not "Review"
    const reviewInvoices = React.useMemo(() => [], []); // No longer used for partial payments
    const openInvoices = React.useMemo(() => invoices.filter((inv) => inv.status !== "paid"), [invoices]);

    return (
        <div className="space-y-6">
            {/* Notification Dialog */}
            <AlertDialog
                open={notificationDialog.open}
                onOpenChange={(open) => !open && closeDialog()}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{notificationDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription className="whitespace-pre-line">
                            {notificationDialog.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={closeDialog}>
                            {t("reconciliation.ui.removeConfirmTitle")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={deleteConfirmDialog}
                onOpenChange={(open) => !open && closeDialog()}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("reconciliation.ui.confirmRemove")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("reconciliation.ui.removeConfirmBody", { n: transactions.length })}
                            <br />
                            {t("reconciliation.ui.removeConfirmNote")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete}>
                            {t("reconciliation.ui.removeConfirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Snapshot Dialog */}
            <SnapshotDialog
                open={isSnapshotDialogOpen}
                onOpenChange={(open) => !open && closeDialog()}
                snapshotMonth={snapshotMonth}
                onSnapshotMonthChange={setSnapshotMonth}
                onConfirm={handleConfirmSaveSnapshot}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="work">{t("reconciliation.ui.tabWork")}</TabsTrigger>
                    <TabsTrigger value="summary">{t("reconciliation.ui.tabSummary")}</TabsTrigger>
                </TabsList>

                <TabsContent value="work" className="space-y-6">
                    <AmbiguousTransactions transactions={transactions} />

                    <Collapsible
                        open={isTransactionsOpen}
                        onOpenChange={setIsTransactionsOpen}
                    >
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CollapsibleTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="p-0 hover:bg-transparent"
                                        >
                                            {isTransactionsOpen ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                            <span className="sr-only">Toggle</span>
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CardTitle>{t("reconciliation.ui.bankStatement")}</CardTitle>
                                </div>
                                <ReconciliationActions
                                    isEditing={isEditing}
                                    hasTransactions={transactions.length > 0}
                                    isMatching={isMatching}
                                    onEditToggle={handleEditToggle}
                                    onSave={handleSave}
                                    onOpenSnapshotDialog={handleOpenSnapshotDialog}
                                    onClear={handleClear}
                                    onAutoMatch={handleAutoMatch}
                                />
                            </CardHeader>
                            <CollapsibleContent>
                                <CardContent>
                                    <TransactionList
                                        transactions={transactions}
                                        selectedTxId={selectedTx}
                                        isEditing={isEditing}
                                        editValues={editValues}
                                        onSelect={setSelectedTx}
                                        onInputChange={handleInputChange}
                                        getStatus={getTransactionStatus}
                                        getMatchedInvoices={getMatchedInvoices}
                                    />
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>

                    <Collapsible
                        open={isInvoicesOpen}
                        onOpenChange={setIsInvoicesOpen}
                    >
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CollapsibleTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="p-0 hover:bg-transparent"
                                        >
                                            {isInvoicesOpen ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                            <span className="sr-only">Toggle</span>
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CardTitle>{t("reconciliation.ui.openInvoices")}</CardTitle>
                                </div>
                            </CardHeader>
                            <CollapsibleContent>
                                <CardContent>
                                    <InvoiceList invoices={workInvoices} />
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>

                    {overpayments && overpayments.length > 0 && (
                        <Card className="border-2 border-green-500/50 bg-green-500/10 dark:border-green-400/50 dark:bg-green-400/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                    <CheckCircle2 className="w-5 h-5" />
                                    {t("reconciliation.ui.availableCredit")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("reconciliation.ui.companyName")}</TableHead>
                                            <TableHead>{t("reconciliation.ui.last5")}</TableHead>
                                            <TableHead className="text-right">{t("reconciliation.ui.amount")}</TableHead>
                                            <TableHead>{t("reconciliation.ui.description")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {overpayments.map((op) => (
                                            <TableRow key={op.id}>
                                                <TableCell className="font-medium">{op.company.name}</TableCell>
                                                <TableCell className="font-mono">{op.last5Digits}</TableCell>
                                                <TableCell className="text-right font-mono font-bold">${op.amount.toLocaleString()}</TableCell>
                                                <TableCell>{op.description || "-"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="summary" className="space-y-6">
                    <ReconciliationSummary
                        paidInvoices={paidInvoices}
                        reviewInvoices={reviewInvoices}
                        openInvoices={openInvoices}
                        overpayments={overpayments}
                        notificationTemplates={notificationTemplates}
                        markedInvoiceIds={markedInvoiceIds}
                        toggleInvoiceMark={toggleInvoiceMark}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
