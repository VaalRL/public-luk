"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { InvoiceReminder } from "./types";

interface InvoiceReminderSectionProps {
    reminders: InvoiceReminder[];
    isFormDisabled: boolean;
    onRemindersChange: (reminders: InvoiceReminder[]) => void;
}

export function InvoiceReminderSection({
    reminders,
    isFormDisabled,
    onRemindersChange,
}: InvoiceReminderSectionProps) {
    const addReminder = () => {
        const newReminder: InvoiceReminder = {
            id: `temp-${Date.now()}`,
            date: new Date(),
            text: "",
        };
        onRemindersChange([...reminders, newReminder]);
    };

    const updateReminder = (index: number, updates: Partial<InvoiceReminder>) => {
        const newReminders = [...reminders];
        newReminders[index] = { ...newReminders[index], ...updates };
        onRemindersChange(newReminders);
    };

    const removeReminder = (index: number) => {
        const newReminders = reminders.filter((_, i) => i !== index);
        onRemindersChange(newReminders);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>提醒事項 (選填)</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addReminder}
                    disabled={isFormDisabled}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    新增提醒
                </Button>
            </div>

            <div className="space-y-3">
                {reminders.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                        尚無提醒事項
                    </div>
                ) : (
                    reminders.map((reminder, index) => (
                        <div key={reminder.id || index} className="flex items-start gap-2 p-3 border rounded-lg">
                            <div className="flex-1 space-y-2">
                                <Input
                                    type="date"
                                    value={
                                        reminder.date instanceof Date && !isNaN(reminder.date.getTime())
                                            ? reminder.date.toISOString().split("T")[0]
                                            : new Date().toISOString().split("T")[0]
                                    }
                                    onChange={(e) => {
                                        const newDate = new Date(e.target.value);
                                        if (!isNaN(newDate.getTime())) {
                                            updateReminder(index, { date: newDate });
                                        }
                                    }}
                                    disabled={isFormDisabled}
                                />
                                <Input
                                    type="text"
                                    placeholder="提醒內容 (例如：請款、催款、確認收款等)"
                                    value={reminder.text || ""}
                                    onChange={(e) => updateReminder(index, { text: e.target.value })}
                                    disabled={isFormDisabled}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeReminder(index)}
                                disabled={isFormDisabled}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
