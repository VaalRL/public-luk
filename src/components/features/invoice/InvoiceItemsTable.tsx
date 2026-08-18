"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { ServiceItemRow } from "./ServiceItemRow";
import { ReimbursementItemRow } from "./ReimbursementItemRow";
import { InvoiceItem, ItemTemplate } from "./types";

interface InvoiceItemsTableProps {
    items: InvoiceItem[];
    itemTemplates: ItemTemplate[];
    isFormDisabled: boolean;
    updateItem: (index: number, field: keyof InvoiceItem, value: string | number) => void;
    removeItem: (index: number) => void;
    applyTemplate: (index: number, templateName: string) => void;
    addItem: (type: "service" | "reimbursement") => void;
}

export function InvoiceItemsTable({
    items,
    itemTemplates,
    isFormDisabled,
    updateItem,
    removeItem,
    applyTemplate,
    addItem,
}: InvoiceItemsTableProps) {
    const t = useT();
    const serviceItems = items.filter((item) => item.type === "service");
    const reimbursementItems = items.filter((item) => item.type === "reimbursement");

    return (
        <div className="space-y-6">
            {/* 服務項目 */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t("invoicing.items.service")}</h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItem("service")}
                        disabled={isFormDisabled}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {t("invoicing.form.addService")}
                    </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">{t("invoicing.items.name")}</TableHead>
                                <TableHead className="w-[250px]">{t("invoicing.items.content")}</TableHead>
                                <TableHead className="w-[100px]">{t("invoicing.items.quantity")}</TableHead>
                                <TableHead className="w-[120px]">{t("invoicing.items.price")}</TableHead>
                                <TableHead className="w-[120px]">{t("invoicing.items.amount")}</TableHead>
                                <TableHead className="w-[200px]">{t("invoicing.items.note")}</TableHead>
                                <TableHead className="w-[80px]">{t("invoicing.items.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {serviceItems.length === 0 ? (
                                <TableRow>
                                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                                        {t("invoicing.form.noServiceRows")}
                                    </td>
                                </TableRow>
                            ) : (
                                serviceItems.map((item, _idx) => {
                                    const originalIndex = items.findIndex(
                                        (i) => i === item
                                    );
                                    return (
                                        <ServiceItemRow
                                            key={originalIndex}
                                            item={item}
                                            index={originalIndex}
                                            isFormDisabled={isFormDisabled}
                                            itemTemplates={itemTemplates}
                                            updateItem={updateItem}
                                            removeItem={removeItem}
                                            applyTemplate={applyTemplate}
                                        />
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* 代墊項目 */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t("invoicing.items.reimbursement")}</h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItem("reimbursement")}
                        disabled={isFormDisabled}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {t("invoicing.form.addReimbursement")}
                    </Button>
                </div>
                {reimbursementItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">{t("invoicing.items.name")}</TableHead>
                                    <TableHead className="w-[250px]">{t("invoicing.items.content")}</TableHead>
                                    <TableHead className="w-[100px]">{t("invoicing.items.quantity")}</TableHead>
                                    <TableHead className="w-[120px]">{t("invoicing.items.price")}</TableHead>
                                    <TableHead className="w-[120px]">{t("invoicing.items.amount")}</TableHead>
                                    <TableHead className="w-[200px]">{t("invoicing.items.note")}</TableHead>
                                    <TableHead className="w-[80px]">{t("invoicing.items.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reimbursementItems.map((item, _idx) => {
                                    const originalIndex = items.findIndex(
                                        (i) => i === item
                                    );
                                    return (
                                        <ReimbursementItemRow
                                            key={originalIndex}
                                            item={item}
                                            index={originalIndex}
                                            isFormDisabled={isFormDisabled}
                                            updateItem={updateItem}
                                            removeItem={removeItem}
                                        />
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
                {reimbursementItems.length === 0 && (
                    <div className="border rounded-lg overflow-hidden bg-muted/30">
                        <div className="text-center py-8 text-muted-foreground">
                            {t("invoicing.form.noReimbursementRows")}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
