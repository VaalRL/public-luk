import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useInvoiceStore } from "@/stores";
import { createInvoice, updateInvoice, getNextInvoiceNumber } from "@/app/actions/invoice";
import { invoiceFormSchema, type InvoiceFormData, type InvoiceItem } from "@/lib/validations/invoice";
import { Invoice, InvoiceReminder, ItemTemplate } from "@/components/features/invoice/types";

interface UseInvoiceFormProps {
    initialData?: Invoice | null;
    itemTemplates: ItemTemplate[];
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function useInvoiceForm({
    initialData,
    itemTemplates,
    onSuccess,
    onCancel,
}: UseInvoiceFormProps) {
    const { toast } = useToast();
    const { addInvoice, updateInvoice: updateInvoiceInStore } = useInvoiceStore();

    // Local state
    const [items, setItems] = useState<InvoiceItem[]>(
        initialData && typeof initialData.items === "string"
            ? JSON.parse(initialData.items)
            : [
                {
                    type: "service",
                    name: "",
                    content: "",
                    quantity: 1,
                    price: 0,
                    amount: 0,
                    note: "",
                },
            ]
    );
    const [reminders, setReminders] = useState<InvoiceReminder[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(null);
    const [openCompany, setOpenCompany] = useState(false);
    const [openProvider, setOpenProvider] = useState(false);

    // Form setup
    const form = useForm<InvoiceFormData>({
        resolver: zodResolver(invoiceFormSchema),
        defaultValues: {
            companyId: "",
            providerId: "",
            date: new Date(),
            items: items,
            taxRate: 5,
            issueInvoice: true,
            title: "報價單",
        },
    });

    const { setValue, watch, reset } = form;

    // Watch values
    const taxRate = watch("taxRate");
    const issueInvoice = watch("issueInvoice");
    const companyId = watch("companyId");
    const providerId = watch("providerId");
    const date = watch("date");
    const invoiceNumber = watch("invoiceNumber");
    const title = watch("title");
    // Auto-generate invoice number
    useEffect(() => {
        const generateNumber = async () => {
            if (companyId && providerId && date && !initialData && !invoiceNumber) {
                try {
                    const nextNumber = await getNextInvoiceNumber(companyId, providerId, date);
                    if (nextNumber) {
                        setValue("invoiceNumber", nextNumber);
                    }
                } catch (error) {
                    console.error("Failed to generate invoice number:", error);
                }
            }
        };

        const timer = setTimeout(() => {
            generateNumber();
        }, 500); // Debounce to avoid rapid calls

        return () => clearTimeout(timer);
    }, [companyId, providerId, date, initialData, setValue, invoiceNumber]);

    // Initialize form data
    useEffect(() => {
        if (initialData) {
            const parsedItems = (
                typeof initialData.items === "string"
                    ? JSON.parse(initialData.items)
                    : initialData.items
            ).map((item: InvoiceItem) => ({
                ...item,
                type: item.type || "service",
                content: item.content || item.description || "",
                note: item.note || "",
            }));

            setItems(parsedItems);
            setValue("items", parsedItems);
            setValue("companyId", initialData.companyId);
            setValue("providerId", initialData.providerId || "");
            setValue("date", new Date(initialData.date));
            setValue("invoiceNumber", initialData.invoiceNumber || "");
            setValue("title", initialData.title || "報價單");

            const shouldIssueInvoice = (initialData as { issueInvoice?: boolean }).issueInvoice ?? true;
            setValue("issueInvoice", shouldIssueInvoice);

            if (initialData.reminders) {
                setReminders(
                    initialData.reminders.map((r) => ({
                        id: r.id,
                        date: new Date(r.date),
                        text: r.text || "",
                    }))
                );
            }
        }
    }, [initialData, setValue]);

    // Sync items to form
    useEffect(() => {
        setValue("items", items);
    }, [items, setValue]);

    // Item manipulation functions
    const addItem = useCallback((type: "service" | "reimbursement" = "service") => {
        setItems((prev) => [
            ...prev,
            {
                type,
                name: "",
                content: "",
                quantity: 1,
                price: 0,
                amount: 0,
                note: "",
            },
        ]);
    }, []);

    const removeItem = useCallback((index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const updateItem = useCallback((
        index: number,
        field: keyof InvoiceItem,
        value: string | number
    ) => {
        setItems((prev) => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };

            // Auto-calculate amount
            if (field === "quantity" || field === "price") {
                newItems[index].amount =
                    newItems[index].quantity * newItems[index].price;
            }
            return newItems;
        });
    }, []);

    const applyTemplate = useCallback((index: number, templateName: string) => {
        setItems((prev) => {
            const template = itemTemplates.find((t) => t.name === templateName);
            if (template) {
                const newItems = [...prev];
                newItems[index] = {
                    ...newItems[index],
                    name: template.name,
                    quantity: template.quantity || 1,
                    price: template.price || 0,
                    amount: (template.quantity || 1) * (template.price || 0),
                };
                return newItems;
            } else {
                const newItems = [...prev];
                newItems[index] = { ...newItems[index], name: templateName };
                return newItems;
            }
        });
    }, [itemTemplates]);

    // Calculations
    const calculateServiceSubtotal = useMemo(() => {
        return Math.round(
            items
                .filter((item) => !item.type || item.type === "service")
                .reduce((sum, item) => sum + item.amount, 0)
        );
    }, [items]);

    const calculateReimbursementTotal = useMemo(() => {
        return Math.round(
            items
                .filter((item) => item.type === "reimbursement")
                .reduce((sum, item) => sum + item.amount, 0)
        );
    }, [items]);

    const calculateTax = useMemo(() => {
        if (!issueInvoice) return 0;
        return Math.round(calculateServiceSubtotal * (taxRate / 100));
    }, [issueInvoice, calculateServiceSubtotal, taxRate]);

    const calculateTotal = useMemo(() => {
        return calculateServiceSubtotal + calculateTax + calculateReimbursementTotal;
    }, [calculateServiceSubtotal, calculateTax, calculateReimbursementTotal]);

    // Submit handler
    const onSubmit = async (data: InvoiceFormData) => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...data,
                items: items,
                reminders: reminders.map((r) => ({
                    date: r.date,
                    text: r.text,
                })),
                amount: calculateServiceSubtotal,
                taxAmount: calculateTax,
                totalAmount: calculateTotal,
            };

            let result;
            if (initialData) {
                result = await updateInvoice(initialData.id, payload);
            } else {
                result = await createInvoice(payload);
            }

            if (result.success) {
                toast({
                    title: initialData ? "更新成功" : "建立成功",
                    description: "帳單已儲存",
                });

                const savedData = result.data;
                if (savedData) {
                    // Update store
                    if (initialData) {
                        updateInvoiceInStore(initialData.id, savedData);
                    } else {
                        addInvoice(savedData);
                    }

                    setSavedInvoice(savedData as Invoice);
                    if (onSuccess) onSuccess();
                }
            } else {
                toast({
                    title: "儲存失敗",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "錯誤",
                description: "發生未預期的錯誤",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setSavedInvoice(null);
        reset();
        setItems([
            {
                type: "service",
                name: "",
                content: "",
                quantity: 1,
                price: 0,
                amount: 0,
                note: "",
            },
        ]);
        setReminders([]);
        if (onCancel) onCancel();
    };

    return {
        form,
        state: {
            items,
            reminders,
            isSubmitting,
            savedInvoice,
            openCompany,
            openProvider,
            taxRate,
            issueInvoice,
            companyId,
            providerId,
            date,
            invoiceNumber,
            title,
        },
        actions: {
            setItems,
            setReminders,
            setSavedInvoice,
            setOpenCompany,
            setOpenProvider,
            addItem,
            removeItem,
            updateItem,
            applyTemplate,
            onSubmit,
            resetForm,
        },
        calculations: {
            calculateServiceSubtotal,
            calculateReimbursementTotal,
            calculateTax,
            calculateTotal,
        },
    };
}
