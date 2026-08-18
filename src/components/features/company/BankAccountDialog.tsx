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
import { useT } from "@/lib/i18n/context";
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
    const t = useT();
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
                    <DialogTitle>{t("bankAccountDialog.title")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="accountNumber">{t("bankAccountDialog.accountNumber")} *</Label>
                        <Input
                            id="accountNumber"
                            value={formData.accountNumber}
                            onChange={(e) => handleChange("accountNumber", e.target.value)}
                            placeholder={t("bankAccountDialog.accountNumberPlaceholder")}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="branch">{t("bankAccountDialog.branch")}</Label>
                        <Input
                            id="branch"
                            value={formData.branch}
                            onChange={(e) => handleChange("branch", e.target.value)}
                            placeholder={t("bankAccountDialog.branchPlaceholder")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="accountHolder">{t("bankAccountDialog.holder")}</Label>
                        <Input
                            id="accountHolder"
                            value={formData.accountHolder}
                            onChange={(e) => handleChange("accountHolder", e.target.value)}
                            placeholder={t("bankAccountDialog.holderPlaceholder")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="currency">{t("bankAccountDialog.currency")}</Label>
                        <Select
                            value={formData.currency}
                            onValueChange={(value) => handleChange("currency", value)}
                        >
                            <SelectTrigger id="currency">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TWD">{t("bankAccountDialog.currencyTwd")}</SelectItem>
                                <SelectItem value="USD">{t("bankAccountDialog.currencyUsd")}</SelectItem>
                                <SelectItem value="EUR">{t("bankAccountDialog.currencyEur")}</SelectItem>
                                <SelectItem value="JPY">{t("bankAccountDialog.currencyJpy")}</SelectItem>
                                <SelectItem value="CNY">{t("bankAccountDialog.currencyCny")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="note">{t("bankAccountDialog.note")}</Label>
                        <Input
                            id="note"
                            value={formData.note}
                            onChange={(e) => handleChange("note", e.target.value)}
                            placeholder={t("bankAccountDialog.notePlaceholder")}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? t("bankAccountDialog.adding") : t("bankAccountDialog.add")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
