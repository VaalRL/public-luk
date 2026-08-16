"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BankAccountFormData } from "./types";

interface BankAccountDialogProps {
    isOpen: boolean;
    onClose: () => void;
    formData: BankAccountFormData;
    onFormDataChange: (data: BankAccountFormData) => void;
    onSubmit: () => Promise<void>;
    isSubmitting?: boolean;
}

export function BankAccountDialog({
    isOpen,
    onClose,
    formData,
    onFormDataChange,
    onSubmit,
    isSubmitting = false,
}: BankAccountDialogProps) {
    const handleChange = (field: keyof BankAccountFormData, value: string) => {
        onFormDataChange({
            ...formData,
            [field]: value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>新增銀行帳號</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="accountNumber">帳號 *</Label>
                        <Input
                            id="accountNumber"
                            value={formData.accountNumber}
                            onChange={(e) => handleChange("accountNumber", e.target.value)}
                            placeholder="請輸入銀行帳號"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="branch">分行</Label>
                        <Input
                            id="branch"
                            value={formData.branch}
                            onChange={(e) => handleChange("branch", e.target.value)}
                            placeholder="請輸入分行名稱"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="accountHolder">戶名</Label>
                        <Input
                            id="accountHolder"
                            value={formData.accountHolder}
                            onChange={(e) => handleChange("accountHolder", e.target.value)}
                            placeholder="請輸入戶名"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="currency">幣別</Label>
                        <Select
                            value={formData.currency}
                            onValueChange={(value) => handleChange("currency", value)}
                        >
                            <SelectTrigger id="currency">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TWD">TWD (新台幣)</SelectItem>
                                <SelectItem value="USD">USD (美元)</SelectItem>
                                <SelectItem value="EUR">EUR (歐元)</SelectItem>
                                <SelectItem value="JPY">JPY (日圓)</SelectItem>
                                <SelectItem value="CNY">CNY (人民幣)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="note">備註</Label>
                        <Input
                            id="note"
                            value={formData.note}
                            onChange={(e) => handleChange("note", e.target.value)}
                            placeholder="請輸入備註"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            取消
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "新增中..." : "新增"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
