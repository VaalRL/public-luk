"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import {
    createCompany,
    updateCompany,
    deleteCompany,
    addBankAccount,
    deleteBankAccount,
} from "@/app/actions/company";
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
import { useCompanyStore } from "@/stores";
import {
    CompanyList,
    CompanyFormDialog,
    BankAccountDialog,
    type Company,
    type CompanyFormData,
    type BankAccountFormData,
} from "@/components/features/company";

interface CompanyManagementProps {
    initialCompanies: Company[];
}

export function CompanyManagement({ initialCompanies }: CompanyManagementProps) {
    const { toast } = useToast();

    // Zustand store
    const {
        companies,
        setCompanies,
        currentCompany,
        setCurrentCompany,
        updateCompany: updateCompanyInStore,
        deleteCompany: deleteCompanyFromStore,
    } = useCompanyStore();

    // Initialize store with server data
    useEffect(() => {
        setCompanies(initialCompanies);
    }, [initialCompanies, setCompanies]);

    // Ref for pending bank accounts
    const pendingBankAccountsRef = React.useRef<BankAccountFormData[]>([]);

    // Ref for current bank account input (not yet added to pending list)
    const currentBankAccountRef = React.useRef<BankAccountFormData>({
        accountNumber: "",
        branch: "",
        accountHolder: "",
        currency: "TWD",
        note: "",
    });

    // Local UI state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isBankAccountDialogOpen, setIsBankAccountDialogOpen] = useState(false);
    const [addingAccountForCompany, setAddingAccountForCompany] = useState<string | null>(null);

    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        type: "company" | "bankAccount";
        id: string;
        title: string;
        description: string;
    }>({
        isOpen: false,
        type: "company",
        id: "",
        title: "",
        description: "",
    });

    const [formData, setFormData] = useState<CompanyFormData>({
        name: "",
        shortName: "",
        taxId: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        note: "",
        defaultInvoiceEnabled: false,
        logoPath: "",
        stampPath: "",
    });

    const [bankAccountFormData, setBankAccountFormData] = useState<BankAccountFormData>({
        accountNumber: "",
        branch: "",
        accountHolder: "",
        currency: "TWD",
        note: "",
    });

    // Reset form
    const resetForm = () => {
        setFormData({
            name: "",
            shortName: "",
            taxId: "",
            contactName: "",
            email: "",
            phone: "",
            address: "",
            note: "",
            defaultInvoiceEnabled: false,
            logoPath: "",
            stampPath: "",
        });
        setCurrentCompany(null);
    };

    const resetBankAccountForm = () => {
        setBankAccountFormData({
            accountNumber: "",
            branch: "",
            accountHolder: "",
            currency: "TWD",
            note: "",
        });
    };

    // Handle company form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            let result;
            if (currentCompany) {
                result = await updateCompany(currentCompany.id, formData);
            } else {
                result = await createCompany(formData);
            }

            if (result.success) {
                // After creating/updating company, add pending bank accounts
                const companyId = currentCompany?.id || result.data?.id;
                const pendingAccounts = [...pendingBankAccountsRef.current];

                // Check if there's a bank account being entered but not yet added to pending list
                const currentAccount = currentBankAccountRef.current;
                if (currentAccount.accountNumber.trim()) {
                    console.log('Auto-adding current bank account input to pending list:', currentAccount);
                    pendingAccounts.push({ ...currentAccount });
                }

                if (companyId && pendingAccounts.length > 0) {
                    console.log(`Adding ${pendingAccounts.length} pending bank accounts...`);

                    // Add each pending bank account
                    for (const account of pendingAccounts) {
                        const addResult = await addBankAccount({
                            companyId,
                            accountNumber: account.accountNumber,
                            branch: account.branch || undefined,
                            accountHolder: account.accountHolder || undefined,
                            currency: account.currency || "TWD",
                            note: account.note || undefined,
                        });

                        if (!addResult.success) {
                            console.error("Failed to add bank account:", addResult.error);
                        }
                    }

                    // Clear pending accounts
                    pendingBankAccountsRef.current = [];
                }

                setIsDialogOpen(false);
                resetForm();
                toast({
                    title: currentCompany ? "更新成功" : "建立成功",
                    description: currentCompany ? "公司資料已更新" : "公司已建立",
                });

                // Update store
                if (currentCompany && result.data) {
                    updateCompanyInStore(currentCompany.id, result.data);
                }

                window.location.reload();
            } else {
                toast({
                    title: currentCompany ? "更新失敗" : "建立失敗",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "錯誤",
                description: "操作失敗，請稍後再試",
                variant: "destructive",
            });
        }
    };

    // Handle edit
    const handleEdit = (company: Company) => {
        setCurrentCompany(company);
        setFormData({
            name: company.name,
            shortName: company.shortName || "",
            taxId: company.taxId || "",
            contactName: company.contactName || "",
            email: company.email || "",
            phone: company.phone || "",
            address: company.address || "",
            note: company.note || "",
            defaultInvoiceEnabled: company.defaultInvoiceEnabled ?? false,
            logoPath: company.logoPath || "",
            stampPath: company.stampPath || "",
        });
        setIsDialogOpen(true);
    };

    // Handle delete
    const handleDelete = (id: string) => {
        setDeleteConfirmation({
            isOpen: true,
            type: "company",
            id,
            title: "刪除公司",
            description: "確定要刪除此公司嗎？此操作無法復原。",
        });
    };

    const confirmDelete = async () => {
        let result;
        if (deleteConfirmation.type === "company") {
            result = await deleteCompany(deleteConfirmation.id);
        } else {
            result = await deleteBankAccount(deleteConfirmation.id);
        }

        if (result.success) {
            setDeleteConfirmation({ ...deleteConfirmation, isOpen: false });
            toast({
                title: "刪除成功",
                description: "資料已刪除",
            });

            // Update store
            if (deleteConfirmation.type === "company") {
                deleteCompanyFromStore(deleteConfirmation.id);
            }

            window.location.reload();
        } else {
            toast({
                title: "刪除失敗",
                description: result.error,
                variant: "destructive",
            });
        }
    };

    // Handle add bank account from list
    const handleAddBankAccount = (companyId: string) => {
        setAddingAccountForCompany(companyId);
        resetBankAccountForm();
        setIsBankAccountDialogOpen(true);
    };

    const handleBankAccountSubmit = async () => {
        if (!addingAccountForCompany) return;
        if (!bankAccountFormData.accountNumber) {
            toast({
                title: "請輸入銀行帳號",
                variant: "destructive",
            });
            return;
        }

        const result = await addBankAccount({
            companyId: addingAccountForCompany,
            accountNumber: bankAccountFormData.accountNumber,
            branch: bankAccountFormData.branch || undefined,
            accountHolder: bankAccountFormData.accountHolder || undefined,
            currency: bankAccountFormData.currency,
            note: bankAccountFormData.note || undefined,
        });

        if (result.success) {
            setIsBankAccountDialogOpen(false);
            resetBankAccountForm();
            toast({
                title: "新增成功",
                description: "銀行帳號已新增",
            });
            window.location.reload();
        } else {
            toast({
                title: "新增失敗",
                description: result.error,
                variant: "destructive",
            });
        }
    };

    // Handle add bank account from form dialog (inline)
    const handleInlineAddBankAccount = async (data: {
        accountNumber: string;
        branch?: string;
        accountHolder?: string;
        currency?: string;
        note?: string;
    }) => {
        if (!currentCompany?.id) {
            toast({
                title: "錯誤",
                description: "請先儲存公司資料",
                variant: "destructive",
            });
            return;
        }

        const result = await addBankAccount({
            companyId: currentCompany.id,
            accountNumber: data.accountNumber,
            branch: data.branch,
            accountHolder: data.accountHolder,
            currency: data.currency || "TWD",
            note: data.note,
        });

        if (result.success) {
            toast({
                title: "新增成功",
                description: "銀行帳號已新增",
            });
            window.location.reload();
        } else {
            toast({
                title: "新增失敗",
                description: result.error,
                variant: "destructive",
            });
            throw new Error(result.error);
        }
    };

    // Handle delete bank account from form dialog (inline)
    const handleInlineDeleteBankAccount = async (accountId: string) => {
        const result = await deleteBankAccount(accountId);

        if (result.success) {
            toast({
                title: "刪除成功",
                description: "銀行帳號已刪除",
            });
            window.location.reload();
        } else {
            toast({
                title: "刪除失敗",
                description: result.error,
                variant: "destructive",
            });
            throw new Error(result.error);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        公司管理
                    </CardTitle>
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        新增公司
                    </Button>
                </CardHeader>
                <CardContent>
                    <CompanyList
                        companies={companies}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddBankAccount={handleAddBankAccount}
                    />
                </CardContent>
            </Card>

            {/* Company Form Dialog */}
            <CompanyFormDialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    resetForm();
                    pendingBankAccountsRef.current = [];
                    currentBankAccountRef.current = {
                        accountNumber: "",
                        branch: "",
                        accountHolder: "",
                        currency: "TWD",
                        note: "",
                    };
                }}
                editingCompany={currentCompany}
                formData={formData}
                onFormDataChange={setFormData}
                onSubmit={handleSubmit}
                onAddBankAccount={handleInlineAddBankAccount}
                onDeleteBankAccount={handleInlineDeleteBankAccount}
                pendingBankAccountsRef={pendingBankAccountsRef}
                currentBankAccountRef={currentBankAccountRef}
            />

            {/* Bank Account Dialog */}
            <BankAccountDialog
                isOpen={isBankAccountDialogOpen}
                onClose={() => {
                    setIsBankAccountDialogOpen(false);
                    resetBankAccountForm();
                }}
                formData={bankAccountFormData}
                onFormDataChange={setBankAccountFormData}
                onSubmit={handleBankAccountSubmit}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={deleteConfirmation.isOpen}
                onOpenChange={(open) =>
                    setDeleteConfirmation({ ...deleteConfirmation, isOpen: open })
                }
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{deleteConfirmation.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteConfirmation.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>確定刪除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
