"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LayoutDashboard, FileText, Scale, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import { useSettingsReminder } from "@/hooks/use-settings-reminder";
import { NotificationDot } from "@/components/ui/notification-dot";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";

// 標題存的是文案鍵，實際文字在元件裡依目前語言取出
const navItems: { titleKey: MessageKey; href: string; icon: typeof LayoutDashboard }[] = [
    {
        titleKey: "nav.dashboard",
        href: "/",
        icon: LayoutDashboard,
    },
    {
        titleKey: "nav.invoicing",
        href: "/invoicing",
        icon: FileText,
    },
    {
        titleKey: "nav.reconciliation",
        href: "/reconciliation",
        icon: Scale,
    },
    {
        titleKey: "nav.settings",
        href: "/settings",
        icon: Settings,
    },
];

function AppVersionLabel() {
    const [version, setVersion] = useState("a0.0.3");
    const [mounted, setMounted] = useState(false);

    // Attempt to fetch version from Electron main process
    useState(() => {
        setMounted(true);
        if (typeof window !== 'undefined' && window.electron?.getAppVersion) {
            window.electron.getAppVersion().then((v) => {
                setVersion(`v${v}`);
            }).catch(() => { });
        }
    });

    if (!mounted) return null;

    return (
        <span className="text-[10px] text-muted-foreground font-mono mt-auto mb-0.5">
            {version}
        </span>
    );
}

export function Navbar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const { showAnyReminder } = useSettingsReminder();
    const t = useT();

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto max-w-7xl flex h-14 items-center justify-between px-4 md:px-6 lg:px-8">
                {/* Logo */}
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="relative h-8 w-8">
                        <Image
                            src="/luk-logo.png"
                            alt="Luk"
                            fill
                            className="object-contain dark:invert"
                            priority
                        />
                    </div>
                    <AppVersionLabel />
                </Link>

                {/* Desktop Navigation - Right aligned */}
                <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                    {navItems.map((item) => {
                        // Show only icon for Settings
                        if (item.href === "/settings") {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "relative transition-colors hover:text-foreground/80",
                                        pathname === item.href ? "text-foreground" : "text-foreground/60"
                                    )}
                                    title={t(item.titleKey)}
                                >
                                    <Icon className="w-5 h-5" />
                                    <NotificationDot show={showAnyReminder} size="sm" position="top-right" />
                                </Link>
                            );
                        }

                        // Show text for other items
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "transition-colors hover:text-foreground/80",
                                    pathname === item.href ? "text-foreground" : "text-foreground/60"
                                )}
                            >
                                {t(item.titleKey)}
                            </Link>
                        );
                    })}
                    <LanguageToggle />
                    <ThemeToggle />
                </nav>

                {/* Mobile Menu */}
                <div className="flex md:hidden items-center gap-2">
                    <LanguageToggle />
                    <ThemeToggle />
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                className="px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                            >
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">{t("nav.toggleMenu")}</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="pr-0">
                            <Link
                                href="/"
                                className="flex items-center justify-center"
                                onClick={() => setIsOpen(false)}
                            >
                                <div className="relative h-8 w-8">
                                    <Image
                                        src="/luk-logo.png"
                                        alt="Luk"
                                        fill
                                        className="object-contain dark:invert"
                                    />
                                </div>
                            </Link>
                            <div className="my-4 h-[1px] bg-muted" />
                            <div className="flex flex-col space-y-3">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={cn(
                                            "relative flex items-center text-sm font-medium transition-colors hover:text-foreground/80",
                                            pathname === item.href ? "text-foreground" : "text-foreground/60"
                                        )}
                                    >
                                        <item.icon className="mr-2 h-4 w-4" />
                                        {t(item.titleKey)}
                                        {item.href === "/settings" && (
                                            <NotificationDot show={showAnyReminder} size="sm" position="inline" />
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
