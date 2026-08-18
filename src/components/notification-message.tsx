"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n/context";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotificationMessageProps {
    message: string;
    variant?: "default" | "success";
}

export function NotificationMessage({ message, variant = "default" }: NotificationMessageProps) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
    const t = useT();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            toast({
                title: t("reconciliation.notification.copied"),
                description: t("reconciliation.notification.copiedDescription"),
            });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({
                title: t("reconciliation.notification.copyFailed"),
                description: t("reconciliation.notification.copyFailedDescription"),
                variant: "destructive",
            });
        }
    };

    // For "default" variant (unpaid), show only a copy button with tooltip
    if (variant === "default") {
        return (
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-600" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-sm">
                        <p className="text-sm whitespace-pre-wrap">{message}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // For "success" variant (paid), show the full message box
    return (
        <div
            className="group relative border rounded p-2 text-xs cursor-pointer transition-all border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:hover:bg-green-900"
            onClick={handleCopy}
            title={t("reconciliation.notification.clickToCopy")}
        >
            <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed break-words line-clamp-2 text-green-700 dark:text-green-300">
                        {message}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-200 dark:hover:bg-green-800"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCopy();
                    }}
                >
                    {copied ? (
                        <Check className="w-3 h-3 text-green-600" />
                    ) : (
                        <Copy className="w-3 h-3 text-green-600 dark:text-green-400" />
                    )}
                </Button>
            </div>
        </div>
    );
}
