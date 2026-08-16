"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { InvoiceItem } from "./types";

interface ReimbursementItemRowProps {
    item: InvoiceItem;
    index: number;
    isFormDisabled: boolean;
    updateItem: (index: number, field: keyof InvoiceItem, value: string | number) => void;
    removeItem: (index: number) => void;
}

export const ReimbursementItemRow = React.memo(function ReimbursementItemRow({
    item,
    index,
    isFormDisabled,
    updateItem,
    removeItem,
}: ReimbursementItemRowProps) {
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
    const handleNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateItem(index, "name", e.target.value);
    }, [updateItem, index]);

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
                <Input
                    value={item.name || ""}
                    onChange={handleNameChange}
                    placeholder="項目名稱"
                    disabled={isFormDisabled}
                />
            </TableCell>
            <TableCell>
                <Input
                    value={item.content || item.description || ""}
                    onChange={handleContentChange}
                    placeholder="輸入內容"
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
                    placeholder="備註"
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
