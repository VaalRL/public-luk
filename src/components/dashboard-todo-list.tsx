"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format, isBefore, isSameDay, startOfDay } from "date-fns";
import { CalendarCheck, AlertCircle, Clock, Calendar, Plus, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createStandaloneReminder, toggleReminderStatus } from "@/app/actions/invoice";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FireworksAnimation } from "@/components/ui/fireworks";
import { motion, AnimatePresence } from "framer-motion";

type Reminder = {
    id: string;
    date: Date;
    title?: string | null;
    description?: string | null;
    text?: string | null; // 保留以支援舊資料
    invoiceId: string | null;
    completed: boolean;
    invoice?: {
        id: string;
        invoiceNumber: string | null;
        totalAmount: number;
        paidAmount: number;
        status: string;
        company: {
            name: string;
        };
    } | null;
};

interface DashboardTodoListProps {
    reminders: Reminder[];
}

export function DashboardTodoList({ reminders }: DashboardTodoListProps) {
    const { toast } = useToast();
    const router = useRouter();
    const today = startOfDay(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newReminderDate, setNewReminderDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [newReminderTitle, setNewReminderTitle] = useState("");
    const [newReminderDescription, setNewReminderDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [showFireworks, setShowFireworks] = useState(false);
    const [sortByCompletion, setSortByCompletion] = useState(false);

    // 排序邏輯：可選擇是否將未完成的移到上方
    const sortedReminders = [...reminders].sort((a, b) => {
        if (sortByCompletion && a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        // 預設按日期排序
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const expiredReminders = sortedReminders.filter((r) => isBefore(startOfDay(new Date(r.date)), today));
    const todayReminders = sortedReminders.filter((r) => isSameDay(startOfDay(new Date(r.date)), today));
    const futureReminders = sortedReminders.filter((r) => {
        const d = startOfDay(new Date(r.date));
        return !isBefore(d, today) && !isSameDay(d, today);
    });

    // 只計算未完成的任務數量（用於標籤顯示）
    const expiredIncompleteCount = expiredReminders.filter((r) => !r.completed).length;
    const todayIncompleteCount = todayReminders.filter((r) => !r.completed).length;
    const futureIncompleteCount = futureReminders.filter((r) => !r.completed).length;

    // Check if all today's tasks are completed
    const allTodayTasksCompleted = todayReminders.length > 0 && todayReminders.every(r => r.completed);

    useEffect(() => {
        if (allTodayTasksCompleted && !showFireworks) {
            setShowFireworks(true);
            setTimeout(() => setShowFireworks(false), 4000);
        }
    }, [allTodayTasksCompleted, showFireworks]);

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await toggleReminderStatus(id, !currentStatus);
            // 刷新路由數據以獲取最新狀態
            router.refresh();
        } catch (error) {
            console.error("更新狀態失敗:", error);
            toast({
                title: "更新失敗",
                description: "無法更新任務狀態，請稍後再試",
                variant: "destructive",
            });
        }
    };

    const handleCreateReminder = async () => {
        // 允許空標題和描述
        try {
            setIsCreating(true);
            await createStandaloneReminder(
                new Date(newReminderDate),
                newReminderTitle.trim() || null,
                newReminderDescription.trim() || null
            );
            setIsDialogOpen(false);
            setNewReminderTitle("");
            setNewReminderDescription("");
            setNewReminderDate(format(new Date(), "yyyy-MM-dd"));
            router.refresh();
        } catch (error) {
            console.error("創建提醒失敗:", error);
            toast({
                title: "創建失敗",
                description: "創建提醒失敗，請稍後再試",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const ReminderItem = ({ reminder, status }: { reminder: Reminder; status: "expired" | "today" | "future" }) => {
        const getInvoiceStatus = (inv: NonNullable<Reminder['invoice']>) => {
            if (inv.status === 'paid') {
                return <Badge variant="default" className="bg-green-600 text-[10px] h-5 px-1.5">已付清</Badge>;
            }
            if (inv.paidAmount > 0) {
                return <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-[10px] h-5 px-1.5">部分付款</Badge>;
            }
            return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px] h-5 px-1.5">未付款</Badge>;
        };

        return (
            <div
                className={`flex items-center justify-between p-3 border rounded-lg mb-2 transition-colors ${reminder.completed ? "bg-muted/50 opacity-60" : "hover:bg-accent/50"
                    }`}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                        checked={reminder.completed}
                        onCheckedChange={() => handleToggleStatus(reminder.id, reminder.completed)}
                        className="mr-1 shrink-0"
                    />
                    <div className={`p-2 rounded-full shrink-0 ${status === "expired" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                        status === "today" ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" :
                            "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                        {status === "expired" ? <AlertCircle className="w-4 h-4" /> :
                            status === "today" ? <Clock className="w-4 h-4" /> :
                                <Calendar className="w-4 h-4" />}
                    </div>
                    <div className={`flex-1 min-w-0 ${reminder.completed ? "line-through text-muted-foreground" : ""}`}>
                        {reminder.invoice ? (
                            <>
                                <div className="font-medium truncate">{reminder.invoice.company.name}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                                    <span className="truncate">{reminder.invoice.invoiceNumber || "無帳單號碼"}</span>
                                    <span>•</span>
                                    <span>${reminder.invoice.totalAmount.toLocaleString()}</span>
                                    {getInvoiceStatus(reminder.invoice)}
                                </div>
                                {/* 帳單的備註 */}
                                {(reminder.title || reminder.description || reminder.text) && (
                                    <div className="text-sm text-primary mt-1 font-medium truncate">
                                        📝 {reminder.title || reminder.description || reminder.text}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {/* 個人提醒：顯示標題 */}
                                <div className="font-medium truncate">
                                    📝 {reminder.title || reminder.text || "待辦任務"}
                                </div>
                                {/* 個人提醒：顯示描述 */}
                                {reminder.description && (
                                    <div className="text-sm text-muted-foreground mt-1 truncate">
                                        {reminder.description}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                <div className="text-right ml-3 shrink-0">
                    <div className={`text-sm font-medium ${status === "expired" ? "text-red-600 dark:text-red-400" :
                        status === "today" ? "text-yellow-600 dark:text-yellow-400" :
                            "text-muted-foreground"
                        }`}>
                        {format(new Date(reminder.date), "yyyy/MM/dd")}
                    </div>
                    {reminder.invoice && (
                        <Link href={`/invoicing?id=${reminder.invoiceId}`} className="text-xs text-primary hover:underline block mt-1">
                            查看帳單
                        </Link>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <AnimatePresence>
                {showFireworks && <FireworksAnimation />}
            </AnimatePresence>

            <Card className="h-full">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 h-7">
                            {allTodayTasksCompleted && todayReminders.length > 0 ? (
                                <motion.span
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-green-600 flex items-center gap-2"
                                >
                                    🎉 今日全部完成！
                                </motion.span>
                            ) : (
                                <>
                                    <CalendarCheck className="w-5 h-5" />
                                    待辦事項
                                </>
                            )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant={sortByCompletion ? "default" : "outline"}
                                onClick={() => setSortByCompletion(!sortByCompletion)}
                                className="gap-1"
                            >
                                <ArrowUpDown className="w-4 h-4" />
                                {sortByCompletion ? "按日期" : "按狀態"}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsDialogOpen(true)}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="today" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                            <TabsTrigger value="expired" className="relative">
                                過期
                                {expiredIncompleteCount > 0 && (
                                    <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                        {expiredIncompleteCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="today" className="relative">
                                今日
                                {todayIncompleteCount > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-yellow-500 text-white hover:bg-yellow-600">
                                        {todayIncompleteCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="future">
                                未來
                                {futureIncompleteCount > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                        {futureIncompleteCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="expired" className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {expiredReminders.length > 0 ? (
                                expiredReminders.map((r) => <ReminderItem key={r.id} reminder={r} status="expired" />)
                            ) : (
                                <p className="text-center text-muted-foreground py-8">無過期任務</p>
                            )}
                        </TabsContent>

                        <TabsContent value="today" className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {todayReminders.length > 0 ? (
                                todayReminders.map((r) => <ReminderItem key={r.id} reminder={r} status="today" />)
                            ) : (
                                <p className="text-center text-muted-foreground py-8">今日無任務</p>
                            )}
                        </TabsContent>

                        <TabsContent value="future" className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {futureReminders.length > 0 ? (
                                futureReminders.map((r) => <ReminderItem key={r.id} reminder={r} status="future" />)
                            ) : (
                                <p className="text-center text-muted-foreground py-8">無未來任務</p>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>新增待辦任務</DialogTitle>
                            <DialogDescription>
                                創建一個不與帳單關聯的待辦任務
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="reminder-date">待辦任務日期</Label>
                                <Input
                                    id="reminder-date"
                                    type="date"
                                    value={newReminderDate}
                                    onChange={(e) => setNewReminderDate(e.target.value)}
                                    disabled={isCreating}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reminder-title">任務標題（選填）</Label>
                                <Input
                                    id="reminder-title"
                                    placeholder="例如：聯絡客戶（留空則顯示「待辦任務」）"
                                    value={newReminderTitle}
                                    onChange={(e) => setNewReminderTitle(e.target.value)}
                                    disabled={isCreating}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reminder-description">任務描述（選填）</Label>
                                <Textarea
                                    id="reminder-description"
                                    placeholder="例如：準備會議資料、確認時間..."
                                    value={newReminderDescription}
                                    onChange={(e) => setNewReminderDescription(e.target.value)}
                                    disabled={isCreating}
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                disabled={isCreating}
                            >
                                取消
                            </Button>
                            <Button
                                onClick={handleCreateReminder}
                                disabled={isCreating}
                            >
                                完成
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Card>
        </>
    );
}
