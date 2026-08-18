"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/context";
import {
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check, ChevronsUpDown, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Company } from "./types";

import Link from "next/link";

interface InvoiceFormHeaderProps {
    companyId: string;
    providerId: string;
    date: Date;
    invoiceNumber: string;
    title: string;
    issueInvoice: boolean;
    isFormDisabled: boolean;
    companies: Company[];
    openCompany: boolean;
    openProvider: boolean;
    setOpenCompany: (open: boolean) => void;
    setOpenProvider: (open: boolean) => void;
    onCompanyChange: (companyId: string) => void;
    onProviderChange: (providerId: string) => void;
    onDateChange: (date: Date | undefined) => void;
    onInvoiceNumberChange: (value: string) => void;
    onTitleChange: (value: string) => void;
    onIssueInvoiceChange: (checked: boolean) => void;
}

export function InvoiceFormHeader({
    companyId,
    providerId,
    date,
    invoiceNumber,
    title,
    issueInvoice,
    isFormDisabled,
    companies,
    openCompany,
    openProvider,
    setOpenCompany,
    setOpenProvider,
    onCompanyChange,
    onProviderChange,
    onDateChange,
    onInvoiceNumberChange,
    onTitleChange,
    onIssueInvoiceChange,
}: InvoiceFormHeaderProps) {
    const t = useT();
    const selectedCompany = companies.find((c) => c.id === companyId);
    const selectedProvider = companies.find((c) => c.id === providerId);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 客戶公司 */}
            <div className="space-y-2">
                <Label>{t("invoicing.form.customer")} *</Label>
                <Popover open={openCompany} onOpenChange={setOpenCompany}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCompany}
                            className="w-full justify-between"
                        >
                            {selectedCompany ? selectedCompany.name : t("invoicing.form.selectCustomer")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                        <Command>
                            <CommandInput placeholder={t("invoicing.form.searchCompany")} />
                            <CommandList>
                                <CommandEmpty>
                                    <div className="flex flex-col items-center gap-2 p-2">
                                        <p className="text-sm text-muted-foreground">{t("invoicing.form.noCompanyFound")}</p>
                                        <Button variant="outline" size="sm" asChild className="w-full">
                                            <Link href="/settings">
                                                {t("invoicing.form.goAddCompany")}
                                            </Link>
                                        </Button>
                                    </div>
                                </CommandEmpty>
                                <CommandGroup>
                                    {companies.map((company) => (
                                        <CommandItem
                                            key={company.id}
                                            value={company.name}
                                            onSelect={() => {
                                                onCompanyChange(company.id);
                                                setOpenCompany(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    companyId === company.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {company.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <div className="p-2 border-t mt-2">
                                    <Button variant="ghost" size="sm" asChild className="w-full justify-start h-8">
                                        <Link href="/settings">
                                            <Plus className="mr-2 h-3 w-3" />
                                            {t("invoicing.form.manageCompanies")}
                                        </Link>
                                    </Button>
                                </div>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* 服務提供商 */}
            <div className="space-y-2">
                <Label>{t("invoicing.form.provider")}</Label>
                <Popover open={openProvider} onOpenChange={setOpenProvider}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openProvider}
                            className="w-full justify-between"
                        >
                            {selectedProvider ? selectedProvider.name : t("invoicing.form.selectProvider")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                        <Command>
                            <CommandInput placeholder={t("invoicing.form.searchCompany")} />
                            <CommandList>
                                <CommandEmpty>
                                    <div className="flex flex-col items-center gap-2 p-2">
                                        <p className="text-sm text-muted-foreground">{t("invoicing.form.noCompanyFound")}</p>
                                        <Button variant="outline" size="sm" asChild className="w-full">
                                            <Link href="/settings">
                                                {t("invoicing.form.goAddCompany")}
                                            </Link>
                                        </Button>
                                    </div>
                                </CommandEmpty>
                                <CommandGroup>
                                    {companies.map((company) => (
                                        <CommandItem
                                            key={company.id}
                                            value={company.name}
                                            onSelect={() => {
                                                onProviderChange(company.id);
                                                setOpenProvider(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    providerId === company.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {company.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <div className="p-2 border-t mt-2">
                                    <Button variant="ghost" size="sm" asChild className="w-full justify-start h-8">
                                        <Link href="/settings">
                                            <Plus className="mr-2 h-3 w-3" />
                                            {t("invoicing.form.manageCompanies")}
                                        </Link>
                                    </Button>
                                </div>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* 日期 */}
            <div className="space-y-2">
                <Label>{t("invoicing.form.date")} *</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "yyyy/MM/dd") : <span>{t("invoicing.form.selectDate")}</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={onDateChange}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* 帳單號碼 */}
            <div className="space-y-2">
                <Label>{t("invoicing.form.invoiceNumber")}</Label>
                <Input
                    value={invoiceNumber}
                    onChange={(e) => onInvoiceNumberChange(e.target.value)}
                    placeholder={t("invoicing.form.autoGenerated")}
                />
            </div>

            {/* 標題與開立發票 */}
            <div className="space-y-2 md:col-span-2">
                <Label>{t("invoicing.form.documentTitle")} *</Label>
                <div className="flex items-center gap-4">
                    <Input
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        placeholder={t("pdfTemplate.labels.documentTitle")}
                        className="flex-1"
                    />
                    <div className="flex items-center space-x-2 whitespace-nowrap">
                        <input
                            type="checkbox"
                            id="issueInvoice"
                            checked={issueInvoice}
                            onChange={(e) => onIssueInvoiceChange(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300"
                            disabled={isFormDisabled}
                        />
                        <label
                            htmlFor="issueInvoice"
                            className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            {t("invoicing.form.issueInvoice")}
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
