"use client";

import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ImageIcon, Plus, X } from "lucide-react";
import Image from "next/image";
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
import { useToast } from "@/hooks/use-toast";

type BankAccount = {
    id: string;
    accountNumber: string;
    branch?: string | null;
    accountHolder?: string | null;
    currency: string;
    note?: string | null;
    last5Digits: string;
};

type CompanyFormData = {
    name: string;
    shortName: string;
    taxId: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    note: string;
    defaultInvoiceEnabled: boolean;
    logoPath: string;
    stampPath: string;
};

type BankAccountFormData = {
    accountNumber: string;
    branch: string;
    accountHolder: string;
    currency: string;
    note: string;
};

type CompanyFormFieldsProps = {
    formData: CompanyFormData;
    setFormData: (data: CompanyFormData) => void;
    companyId?: string;
    isEditMode?: boolean;
    bankAccounts?: BankAccount[];
    onAddBankAccount?: (data: {
        accountNumber: string;
        branch?: string;
        accountHolder?: string;
        currency?: string;
        note?: string;
    }) => Promise<void>;
    onDeleteBankAccount?: (accountId: string) => Promise<void>;
    pendingBankAccount?: BankAccountFormData;
    setPendingBankAccount?: (data: BankAccountFormData) => void;
    pendingBankAccountsRef?: React.MutableRefObject<BankAccountFormData[]>;
    currentBankAccountRef?: React.MutableRefObject<BankAccountFormData>;
};

export function CompanyFormFields({
    formData,
    setFormData,
    companyId,
    isEditMode = false,
    bankAccounts = [],
    onDeleteBankAccount,
    pendingBankAccount: externalPendingBankAccount,
    setPendingBankAccount: externalSetPendingBankAccount,
    pendingBankAccountsRef,
    currentBankAccountRef,
}: CompanyFormFieldsProps) {
    const { toast } = useToast();
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingStamp, setIsUploadingStamp] = useState(false);
    const [internalNewBankAccount, setInternalNewBankAccount] = useState<BankAccountFormData>({
        accountNumber: "",
        branch: "",
        accountHolder: "",
        currency: "TWD",
        note: ""
    });

    const newBankAccount = externalPendingBankAccount || internalNewBankAccount;
    const setNewBankAccount = externalSetPendingBankAccount || setInternalNewBankAccount;

    // State for pending bank accounts (to be saved with form)
    const [pendingBankAccounts, setPendingBankAccounts] = useState<BankAccountFormData[]>([]);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null);

    // Update ref when pendingBankAccounts changes
    React.useEffect(() => {
        if (pendingBankAccountsRef) {
            pendingBankAccountsRef.current = pendingBankAccounts;
        }
    }, [pendingBankAccounts, pendingBankAccountsRef]);

    // Update currentBankAccountRef when newBankAccount changes
    React.useEffect(() => {
        if (currentBankAccountRef) {
            currentBankAccountRef.current = newBankAccount;
        }
    }, [newBankAccount, currentBankAccountRef]);

    const handleFileUpload = async (file: File, type: 'logo' | 'stamp') => {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('type', type);
        if (companyId) {
            uploadFormData.append('companyId', companyId);
        }

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
        });

        const data = await response.json();
        if (data.success) {
            return data.path;
        }
        throw new Error('Upload failed');
    };

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingLogo(true);
        try {
            const path = await handleFileUpload(file, 'logo');
            setFormData({ ...formData, logoPath: path });
        } catch {
            toast({
                title: "上傳失敗",
                description: "Logo 上傳失敗",
                variant: "destructive",
            });
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleStampChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingStamp(true);
        try {
            const path = await handleFileUpload(file, 'stamp');
            setFormData({ ...formData, stampPath: path });
        } catch {
            toast({
                title: "上傳失敗",
                description: "簽章上傳失敗",
                variant: "destructive",
            });
        } finally {
            setIsUploadingStamp(false);
        }
    };

    // Add bank account to pending list (not saved until form submit)
    const handleAddBankAccountToPending = () => {
        if (!newBankAccount.accountNumber.trim()) {
            toast({
                title: "請輸入銀行帳號",
                variant: "destructive",
            });
            return;
        }

        // Add to pending list
        setPendingBankAccounts([...pendingBankAccounts, { ...newBankAccount }]);

        // Clear form
        setNewBankAccount({
            accountNumber: "",
            branch: "",
            accountHolder: "",
            currency: "TWD",
            note: ""
        });

        toast({
            title: "已新增到待儲存列表",
            description: "請點擊下方按鈕儲存所有變更",
        });
    };

    // Remove from pending list
    const handleRemovePendingAccount = (index: number) => {
        setPendingBankAccounts(pendingBankAccounts.filter((_, i) => i !== index));
    };

    const handleDeleteBankAccountClick = (accountId: string) => {
        setAccountToDelete(accountId);
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteBankAccount = async () => {
        if (!accountToDelete) return;

        try {
            if (onDeleteBankAccount) {
                await onDeleteBankAccount(accountToDelete);
            }
        } catch {
            toast({
                title: "刪除失敗",
                description: "刪除銀行帳號失敗",
                variant: "destructive",
            });
        } finally {
            setDeleteConfirmOpen(false);
            setAccountToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* 基本資訊 */}
            <div className="space-y-4">
                <h3 className="font-semibold">基本資訊</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="name">公司名稱 *</Label>
                        <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="shortName">公司簡稱</Label>
                        <Input
                            id="shortName"
                            value={formData.shortName}
                            onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                            placeholder="例：台積電"
                        />
                    </div>
                    <div>
                        <Label htmlFor="taxId">統一編號</Label>
                        <Input
                            id="taxId"
                            value={formData.taxId}
                            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="contactName">聯絡人</Label>
                        <Input
                            id="contactName"
                            value={formData.contactName}
                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="phone">電話</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <Label htmlFor="address">地址</Label>
                        <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <Label htmlFor="note">公司筆記</Label>
                        <Input
                            id="note"
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            placeholder="備註事項..."
                        />
                    </div>
                    <div className="col-span-2 flex items-center space-x-2">
                        <input
                            id="defaultInvoiceEnabled"
                            type="checkbox"
                            checked={formData.defaultInvoiceEnabled}
                            onChange={(e) => setFormData({ ...formData, defaultInvoiceEnabled: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="defaultInvoiceEnabled" className="cursor-pointer">預設開發票</Label>
                    </div>
                </div>
            </div>

            {/* 銀行帳號管理 */}
            <div className="space-y-4">
                <h3 className="font-semibold">銀行帳號</h3>

                {/* 現有已儲存帳號列表 */}
                {bankAccounts.length > 0 && (
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">已儲存的帳號：</p>
                        <div className="flex flex-wrap gap-2">
                            {bankAccounts.map((account) => (
                                <Badge
                                    key={account.id}
                                    variant="secondary"
                                    className="px-3 py-1 text-sm flex items-center gap-2"
                                >
                                    <span className="font-mono">{account.accountNumber}</span>
                                    {account.note && (
                                        <span className="text-muted-foreground">({account.note})</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteBankAccountClick(account.id)}
                                        className="ml-1 hover:text-destructive"
                                        title="刪除帳號"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* 待儲存帳號列表 */}
                {pendingBankAccounts.length > 0 && (
                    <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">待儲存的帳號（點擊下方儲存按鈕後生效）：</p>
                        <div className="flex flex-wrap gap-2">
                            {pendingBankAccounts.map((account, index) => (
                                <Badge
                                    key={index}
                                    variant="outline"
                                    className="px-3 py-1 text-sm flex items-center gap-2 border-amber-500 text-amber-700 dark:text-amber-400"
                                >
                                    <span className="font-mono">{account.accountNumber}</span>
                                    {account.note && (
                                        <span className="text-muted-foreground">({account.note})</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePendingAccount(index)}
                                        className="ml-1 hover:text-destructive"
                                        title="移除"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* 新增帳號表單 */}
                <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                        <Label htmlFor="accountNumber">銀行帳號 *</Label>
                        <Input
                            id="accountNumber"
                            placeholder="完整帳號"
                            value={newBankAccount.accountNumber}
                            onChange={(e) => setNewBankAccount({ ...newBankAccount, accountNumber: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <Label htmlFor="branch">分行</Label>
                        <Input
                            id="branch"
                            placeholder="例：台北分行"
                            value={newBankAccount.branch}
                            onChange={(e) => setNewBankAccount({ ...newBankAccount, branch: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <Label htmlFor="accountHolder">戶名</Label>
                        <Input
                            id="accountHolder"
                            placeholder="戶名"
                            value={newBankAccount.accountHolder}
                            onChange={(e) => setNewBankAccount({ ...newBankAccount, accountHolder: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <Label htmlFor="currency">幣別</Label>
                        <Select
                            value={newBankAccount.currency}
                            onValueChange={(value) => setNewBankAccount({ ...newBankAccount, currency: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TWD">新台幣 (TWD)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-2">
                        <Label htmlFor="note">備註</Label>
                        <Input
                            id="note"
                            placeholder="備註"
                            value={newBankAccount.note}
                            onChange={(e) => setNewBankAccount({ ...newBankAccount, note: e.target.value })}
                        />
                    </div>
                    <div className="col-span-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddBankAccountToPending}
                            disabled={!newBankAccount.accountNumber}
                            className="w-full"
                            title="新增到待儲存列表"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    * 系統會自動取帳號後五碼數字進行對帳識別。點擊加號將帳號加入待儲存列表，點擊下方儲存按鈕後統一儲存。
                </p>
            </div>

            {/* 圖片上傳 */}
            <div className="space-y-4">
                <h3 className="font-semibold">圖片設定</h3>
                <div className="grid grid-cols-2 gap-6">
                    {/* Logo */}
                    <div className="space-y-2">
                        <Label>公司 Logo</Label>
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                        />
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            {formData.logoPath ? (
                                <div className="space-y-2">
                                    <div className="relative w-full h-32">
                                        <Image
                                            src={formData.logoPath}
                                            alt="Logo"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={isUploadingLogo}
                                    >
                                        {isUploadingLogo ? "上傳中..." : "更換 Logo"}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={isUploadingLogo}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        {isUploadingLogo ? "上傳中..." : "上傳 Logo"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stamp */}
                    <div className="space-y-2">
                        <Label>公司簽章</Label>
                        <input
                            ref={stampInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleStampChange}
                            className="hidden"
                        />
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                            {formData.stampPath ? (
                                <div className="space-y-2">
                                    <div className="relative w-full h-32">
                                        <Image
                                            src={formData.stampPath}
                                            alt="Stamp"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => stampInputRef.current?.click()}
                                        disabled={isUploadingStamp}
                                    >
                                        {isUploadingStamp ? "上傳中..." : "更換簽章"}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => stampInputRef.current?.click()}
                                        disabled={isUploadingStamp}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        {isUploadingStamp ? "上傳中..." : "上傳簽章"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    * 圖片將用於 PDF 報價單生成{!isEditMode && "（可稍後編輯公司時上傳）"}
                </p>
            </div>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={(open) => {
                setDeleteConfirmOpen(open);
            }}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確認刪除</AlertDialogTitle>
                        <AlertDialogDescription>
                            確定要刪除此銀行帳號嗎？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteBankAccount();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            刪除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
