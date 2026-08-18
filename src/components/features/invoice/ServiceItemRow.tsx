"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/context";
import { TableCell, TableRow } from "@/components/ui/table";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { InvoiceItem, ItemTemplate } from "./types";

import Link from "next/link";

interface ServiceItemRowProps {
    item: InvoiceItem;
    index: number;
    isFormDisabled: boolean;
    itemTemplates: ItemTemplate[];
    updateItem: (index: number, field: keyof InvoiceItem, value: string | number) => void;
    removeItem: (index: number) => void;
    applyTemplate: (index: number, templateName: string) => void;
}

export const ServiceItemRow = React.memo(function ServiceItemRow({
    item,
    index,
    isFormDisabled,
    itemTemplates,
    updateItem,
    removeItem,
    applyTemplate,
}: ServiceItemRowProps) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Local state for price input to allow typing negative numbers
    const [localPrice, setLocalPrice] = useState(item.price.toString());
    const isEditingPrice = useRef(false);

    // Local state for quantity input
    const [localQuantity, setLocalQuantity] = useState(item.quantity.toString());
    const isEditingQuantity = useRef(false);

    useEffect(() => {
        if (!isEditingPrice.current) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- 受控輸入的本地緩衝：外部 prop 變動時同步回輸入框，但使用者正在編輯時（isEditing ref）不覆蓋，避免游標跳動
            setLocalPrice(item.price.toString());
        }
    }, [item.price]);

    useEffect(() => {
        if (!isEditingQuantity.current) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- 受控輸入的本地緩衝：外部 prop 變動時同步回輸入框，但使用者正在編輯時（isEditing ref）不覆蓋，避免游標跳動
            setLocalQuantity(item.quantity.toString());
        }
    }, [item.quantity]);

    // Memoize handlers to prevent recreation on every render
    const handleTemplateSelect = React.useCallback((currentValue: string) => {
        applyTemplate(index, currentValue);
        setOpen(false);
    }, [applyTemplate, index]);

    const handleCreateNew = React.useCallback(() => {
        applyTemplate(index, searchTerm);
        setOpen(false);
    }, [applyTemplate, index, searchTerm]);

    const handleContentChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateItem(index, "content", e.target.value);
    }, [updateItem, index]);

    const handleQuantityChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        isEditingQuantity.current = true;
        const val = e.target.value;
        setLocalQuantity(val);

        const num = parseFloat(val);
        if (!isNaN(num) && !val.endsWith('.') && val !== '-' && val !== '-.') {
            updateItem(index, "quantity", num);
        } else if (val === '') {
            updateItem(index, "quantity", 0);
        }
    }, [updateItem, index]);

    const handleQuantityBlur = React.useCallback(() => {
        isEditingQuantity.current = false;
        const num = parseFloat(localQuantity);
        const finalVal = isNaN(num) ? 0 : num;
        updateItem(index, "quantity", finalVal);
        setLocalQuantity(finalVal.toString());
    }, [updateItem, index, localQuantity]);

    const handlePriceChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        isEditingPrice.current = true;
        const val = e.target.value;
        setLocalPrice(val);

        const num = parseFloat(val);
        if (!isNaN(num) && !val.endsWith('.') && val !== '-' && val !== '-.') {
            updateItem(index, "price", num);
        } else if (val === '') {
            updateItem(index, "price", 0);
        }
    }, [updateItem, index]);

    const handlePriceBlur = React.useCallback(() => {
        isEditingPrice.current = false;
        const num = parseFloat(localPrice);
        const finalVal = isNaN(num) ? 0 : num;
        updateItem(index, "price", finalVal);
        setLocalPrice(finalVal.toString());
    }, [updateItem, index, localPrice]);

    const handleNoteChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateItem(index, "note", e.target.value);
    }, [updateItem, index]);

    const handleRemove = React.useCallback(() => {
        removeItem(index);
    }, [removeItem, index]);

    return (
        <TableRow>
            <TableCell>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between font-normal"
                            disabled={isFormDisabled}
                        >
                            {item.name || t("invoicing.items.selectOrType")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput
                                placeholder={t("invoicing.items.searchOrType")}
                                onValueChange={setSearchTerm}
                            />
                            <CommandList>
                                <CommandEmpty>
                                    <div
                                        className="p-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
                                        onClick={handleCreateNew}
                                    >
                                        <Plus className="w-4 h-4" />
                                        {t("invoicing.form.useTyped")} &quot;{searchTerm}&quot;
                                    </div>
                                    <div className="p-2 border-t mt-1">
                                        <Button variant="outline" size="sm" asChild className="w-full">
                                            <Link href="/settings?tab=invoice-items">
                                                {t("invoicing.form.goAddItem")}
                                            </Link>
                                        </Button>
                                    </div>
                                </CommandEmpty>
                                <CommandGroup>
                                    {itemTemplates.map((template) => (
                                        <CommandItem
                                            key={template.id}
                                            value={template.name}
                                            onSelect={handleTemplateSelect}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    item.name === template.name ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {template.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <div className="p-2 border-t mt-2">
                                    <Button variant="ghost" size="sm" asChild className="w-full justify-start h-8">
                                        <Link href="/settings?tab=invoice-items">
                                            <Plus className="mr-2 h-3 w-3" />
                                            {t("invoicing.form.manageItemTemplates")}
                                        </Link>
                                    </Button>
                                </div>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </TableCell>
            <TableCell>
                <Input
                    value={item.content || item.description || ""}
                    onChange={handleContentChange}
                    placeholder={t("invoicing.items.enterContent")}
                    disabled={isFormDisabled}
                />
            </TableCell>
            <TableCell>
                <Input
                    type="number"
                    value={localQuantity}
                    onChange={handleQuantityChange}
                    onBlur={handleQuantityBlur}
                    disabled={isFormDisabled}
                    step="any"
                />
            </TableCell>
            <TableCell>
                <Input
                    type="number"
                    value={localPrice}
                    onChange={handlePriceChange}
                    onBlur={handlePriceBlur}
                    disabled={isFormDisabled}
                    step="any"
                />
            </TableCell>
            <TableCell>
                <Input
                    type="number"
                    value={item.amount}
                    readOnly
                    className="bg-muted"
                    disabled={isFormDisabled}
                />
            </TableCell>
            <TableCell>
                <Input
                    value={item.note || ""}
                    onChange={handleNoteChange}
                    placeholder={t("invoicing.items.note")}
                    disabled={isFormDisabled}
                />
            </TableCell>
            <TableCell>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRemove}
                    disabled={isFormDisabled}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
});
