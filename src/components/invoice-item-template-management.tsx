"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { createInvoiceItemTemplate, deleteInvoiceItemTemplate } from "@/app/actions/invoice-item-template";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n/context";
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

type InvoiceItemTemplate = {
    id: string;
    name: string;
    quantity: number;
    price: number;
};

export function InvoiceItemTemplateManagement({ initialTemplates }: { initialTemplates: InvoiceItemTemplate[] }) {
    const { toast } = useToast();
    const t = useT();
    const [templates, setTemplates] = useState(initialTemplates);
    const [newItem, setNewItem] = useState<{ name: string; quantity: string | number; price: string | number }>({ name: "", quantity: "1", price: "0" });
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; quantity: string | number; price: string | number }>({ name: "", quantity: 1, price: 0 });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!newItem.name.trim()) {
            toast({
                title: t("itemTemplate.nameRequired"),
                variant: "destructive",
            });
            return;
        }

        try {
            setIsAdding(true);
            const templateData = {
                name: newItem.name,
                quantity: Number(newItem.quantity) || 0,
                price: Number(newItem.price) || 0
            };
            const newTemplate = await createInvoiceItemTemplate(templateData);
            setTemplates([...templates, newTemplate as InvoiceItemTemplate]);
            setNewItem({ name: "", quantity: "1", price: "0" });
        } catch (error) {
            console.error(error);
            toast({
                title: t("itemTemplate.addFailed"),
                description: t("itemTemplate.addFailedDescription"),
                variant: "destructive",
            });
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setItemToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            await deleteInvoiceItemTemplate(itemToDelete);
            setTemplates(templates.filter(t => t.id !== itemToDelete));
        } catch (error) {
            console.error(error);
            toast({
                title: t("itemTemplate.deleteFailed"),
                description: t("itemTemplate.deleteFailedDescription"),
                variant: "destructive",
            });
        } finally {
            setDeleteConfirmOpen(false);
            setItemToDelete(null);
        }
    };

    const startEdit = (template: InvoiceItemTemplate) => {
        setEditingId(template.id);
        setEditForm({
            name: template.name,
            quantity: template.quantity || 1,
            price: template.price || 0
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = async (id: string) => {
        try {
            const { updateInvoiceItemTemplate } = await import("@/app/actions/invoice-item-template");
            const templateData = {
                name: editForm.name,
                quantity: Number(editForm.quantity) || 0,
                price: Number(editForm.price) || 0
            };
            await updateInvoiceItemTemplate(id, templateData);
            setTemplates(templates.map(t => t.id === id ? { ...t, ...templateData } : t));
            setEditingId(null);
        } catch (error) {
            console.error(error);
            toast({
                title: t("itemTemplate.updateFailed"),
                description: t("itemTemplate.updateFailedDescription"),
                variant: "destructive",
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("itemTemplate.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-b pb-6">
                    <div className="md:col-span-2">
                        <Label>{t("itemTemplate.newName")}</Label>
                        <Input
                            value={newItem.name}
                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                            placeholder={t("itemTemplate.namePlaceholder")}
                        />
                    </div>
                    <div>
                        <Label>{t("itemTemplate.defaultQuantity")}</Label>
                        <Input
                            type="number"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>{t("itemTemplate.defaultPrice")}</Label>
                        <Input
                            type="number"
                            value={newItem.price}
                            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-4 flex justify-end">
                        <Button onClick={handleAdd} disabled={isAdding}>
                            <Plus className="w-4 h-4 mr-2" />
                            {t("itemTemplate.add")}
                        </Button>
                    </div>
                </div>

                <div>
                    <Label className="mb-2 block">{t("itemTemplate.existing", { n: templates.length })}</Label>
                    {templates.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            {t("itemTemplate.empty")}
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">{t("itemTemplate.name")}</TableHead>
                                    <TableHead className="w-[15%]">{t("itemTemplate.quantity")}</TableHead>
                                    <TableHead className="w-[20%]">{t("itemTemplate.price")}</TableHead>
                                    <TableHead className="w-[25%]">{t("itemTemplate.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.map((template) => (
                                    <TableRow key={template.id}>
                                        {editingId === template.id ? (
                                            <>
                                                <TableCell>
                                                    <Input
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={editForm.quantity}
                                                        onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={editForm.price}
                                                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => saveEdit(template.id)}>{t("common.save")}</Button>
                                                        <Button size="sm" variant="ghost" onClick={cancelEdit}>{t("common.cancel")}</Button>
                                                    </div>
                                                </TableCell>
                                            </>
                                        ) : (
                                            <>
                                                <TableCell>{template.name}</TableCell>
                                                <TableCell>{template.quantity || 1}</TableCell>
                                                <TableCell>${(template.price || 0).toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => startEdit(template)}
                                                        >
                                                            {t("common.edit")}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(template.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </CardContent>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("itemTemplate.confirmDelete")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("itemTemplate.deleteConfirm")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
