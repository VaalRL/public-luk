"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CompanyFormFields } from "@/components/company-form-fields";
import { useT } from "@/lib/i18n/context";
import { Company, CompanyFormData } from "./types";

type BankAccountFormData = {
    accountNumber: string;
    branch: string;
    accountHolder: string;
    currency: string;
    note: string;
};

interface CompanyFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    editingCompany: Company | null;
    formData: CompanyFormData;
    onFormDataChange: (data: CompanyFormData) => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    onAddBankAccount?: (data: {
        accountNumber: string;
        branch?: string;
        accountHolder?: string;
        currency?: string;
        note?: string;
    }) => Promise<void>;
    onDeleteBankAccount?: (accountId: string) => Promise<void>;
    pendingBankAccountsRef?: React.MutableRefObject<BankAccountFormData[]>;
    currentBankAccountRef?: React.MutableRefObject<BankAccountFormData>;
}

export function CompanyFormDialog({
    isOpen,
    onClose,
    editingCompany,
    formData,
    onFormDataChange,
    onSubmit,
    onAddBankAccount,
    onDeleteBankAccount,
    pendingBankAccountsRef,
    currentBankAccountRef,
}: CompanyFormDialogProps) {
    const t = useT();
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {editingCompany ? t("companyList.editTitle") : t("companyList.addTitle")}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <CompanyFormFields
                        formData={formData}
                        setFormData={onFormDataChange}
                        isEditMode={!!editingCompany}
                        companyId={editingCompany?.id}
                        bankAccounts={editingCompany?.bankAccounts || []}
                        onAddBankAccount={onAddBankAccount}
                        onDeleteBankAccount={onDeleteBankAccount}
                        pendingBankAccountsRef={pendingBankAccountsRef}
                        currentBankAccountRef={currentBankAccountRef}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            onClick={onClose}
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            {editingCompany ? t("common.save") : t("company.add")}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
