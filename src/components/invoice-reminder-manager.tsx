"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, Plus, Trash2 } from "lucide-react";
import { addInvoiceReminder, deleteInvoiceReminder } from "@/app/actions/invoice";
import { format, isSameDay, isBefore, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

interface Reminder {
    id: string;
    date: Date;
}

interface InvoiceReminderManagerProps {
    invoiceId: string;
    reminders: Reminder[];
}

export function InvoiceReminderManager({ invoiceId, reminders }: InvoiceReminderManagerProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [newDate, setNewDate] = useState<string>("");
    const [isAdding, setIsAdding] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);

    const today = startOfDay(new Date());

    // Sort reminders: earliest first
    const sortedReminders = [...reminders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const hasUrgent = sortedReminders.some(r => {
        const d = startOfDay(new Date(r.date));
        return isBefore(d, today) || isSameDay(d, today);
    });

    const getReminderStatus = (date: Date) => {
        const d = startOfDay(new Date(date));
        if (isBefore(d, today)) return "expired";
        if (isSameDay(d, today)) return "today";
        return "future";
    };

    const handleAdd = async () => {
        if (!newDate) return;
        setIsAdding(true);
        try {
            await addInvoiceReminder(invoiceId, new Date(newDate));
            setNewDate("");
        } catch (error) {
            console.error("Failed to add reminder", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setReminderToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!reminderToDelete) return;
        try {
            await deleteInvoiceReminder(reminderToDelete);
        } catch (error) {
            console.error("Failed to delete reminder", error);
            toast({
                title: "刪除失敗",
                description: "刪除提醒失敗",
                variant: "destructive",
            });
        } finally {
            setDeleteConfirmOpen(false);
            setReminderToDelete(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className={cn("h-8 px-2", hasUrgent && "text-red-600 hover:text-red-700 hover:bg-red-50")}>
                    {sortedReminders.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {sortedReminders.map((r) => {
                                const status = getReminderStatus(r.date);
                                return (
                                    <Badge
                                        key={r.id}
                                        variant={status === "future" ? "secondary" : "destructive"}
                                        className={cn(
                                            "text-xs px-1",
                                            status === "today" && "bg-yellow-500 hover:bg-yellow-600 text-white",
                                            status === "expired" && "bg-red-500 hover:bg-red-600 text-white"
                                        )}
                                    >
                                        {format(new Date(r.date), "MM/dd")}
                                    </Badge>
                                );
                            })}
                        </div>
                    ) : (
                        <Bell className="w-4 h-4 text-muted-foreground" />
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>提醒日期管理</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        {sortedReminders.map((reminder) => {
                            const status = getReminderStatus(reminder.date);
                            return (
                                <div
                                    key={reminder.id}
                                    className={cn(
                                        "flex items-center justify-between text-sm border p-2 rounded",
                                        status === "expired" && "border-red-200 bg-red-50 text-red-900",
                                        status === "today" && "border-yellow-200 bg-yellow-50 text-yellow-900"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{format(new Date(reminder.date), "yyyy/MM/dd")}</span>
                                        {status === "expired" && <span className="text-xs font-medium text-red-600">(已過期)</span>}
                                        {status === "today" && <span className="text-xs font-medium text-yellow-600">(今天)</span>}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteClick(reminder.id)}
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            );
                        })}
                        {reminders.length === 0 && (
                            <p className="text-sm text-center text-muted-foreground py-4">尚無提醒日期</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t">
                        <Input
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={handleAdd} disabled={isAdding || !newDate} size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            新增
                        </Button>
                    </div>
                </div>
            </DialogContent>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確認刪除</AlertDialogTitle>
                        <AlertDialogDescription>
                            確定要刪除此提醒嗎？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            刪除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog >
    );
}
