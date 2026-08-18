"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { useLocale, useSetLocale, useT } from "@/lib/i18n/context";

export function LanguageToggle() {
    const locale = useLocale();
    const setLocale = useSetLocale();
    const t = useT();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t("nav.language")}>
                    <Languages className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">{t("nav.language")}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {LOCALES.map((value: Locale) => (
                    <DropdownMenuItem
                        key={value}
                        onClick={() => setLocale(value)}
                        // 目前語言標示出來，讓使用者知道自己在哪個語言
                        className={value === locale ? "font-semibold" : undefined}
                        lang={value}
                    >
                        {LOCALE_LABELS[value]}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
