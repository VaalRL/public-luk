import React from "react";
import { cn } from "@/lib/utils";

interface NotificationDotProps {
    show: boolean;
    size?: "sm" | "md" | "lg";
    position?: "top-right" | "top-left" | "inline";
    className?: string;
    pulse?: boolean;
}

/**
 * 通知紅點組件
 * 用於顯示需要注意的項目（如設定未完成等）
 */
export function NotificationDot({
    show,
    size = "sm",
    position = "top-right",
    className,
    pulse = true,
}: NotificationDotProps) {
    if (!show) return null;

    const sizeClasses = {
        sm: "w-2 h-2",
        md: "w-3 h-3",
        lg: "w-4 h-4",
    };

    const positionClasses = {
        "top-right": "absolute -top-1 -right-1",
        "top-left": "absolute -top-1 -left-1",
        inline: "inline-block ml-2",
    };

    return (
        <span
            className={cn(
                "rounded-full bg-red-500",
                sizeClasses[size],
                positionClasses[position],
                pulse && "animate-pulse",
                className
            )}
            aria-label="需要注意"
        />
    );
}
