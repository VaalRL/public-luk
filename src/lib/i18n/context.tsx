"use client";

/**
 * 語言的 client 端執行時
 *
 * 語言由伺服器決定（讀 cookie）後傳進來，這裡只負責提供查表函式與切換動作。
 * 切換時寫 cookie 再 router.refresh()：server component 上的文字
 * （頁面標題、由伺服器算好的內容）才會跟著換，不會只有 client 元件變了。
 */

import React from "react";
import { useRouter } from "next/navigation";

import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    LOCALE_COOKIE_MAX_AGE,
    LOCALE_TAGS,
    type Locale,
} from "./config";
import { getMessages, translate, type MessageKey, type Messages } from "./messages";

type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

interface LocaleContextValue {
    locale: Locale;
    messages: Messages;
    t: TranslateFn;
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

/**
 * Provider 刻意不碰 router：切換語言的副作用放在 useSetLocale。
 * 這樣元件測試只要包一層 Provider 就能跑，不必連 Next router 一起準備。
 */
export function LocaleProvider({
    locale,
    children,
}: {
    locale: Locale;
    children: React.ReactNode;
}) {
    const messages = React.useMemo(() => getMessages(locale), [locale]);

    const value = React.useMemo<LocaleContextValue>(() => ({
        locale,
        messages,
        t: (key, vars) => translate(messages, key, vars),
    }), [locale, messages]);

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
    const ctx = React.useContext(LocaleContext);
    if (!ctx) {
        throw new Error("useLocale／useT 必須在 LocaleProvider 之內使用");
    }
    return ctx;
}

/** 取得文案函式：`const t = useT(); t("nav.dashboard")` */
export function useT(): TranslateFn {
    return useLocaleContext().t;
}

export function useLocale(): Locale {
    return useLocaleContext().locale;
}

/**
 * 切換語言：寫進 cookie 後要求重新取得伺服器端內容。
 * 少了 router.refresh()，server component 上的文字不會跟著換，畫面會中英夾雜。
 */
export function useSetLocale(): (locale: Locale) => void {
    const router = useRouter();
    return React.useCallback((next: Locale) => {
        document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};samesite=lax`;
        router.refresh();
    }, [router]);
}

/**
 * 依目前語言格式化日期／數字。
 *
 * 專案裡原本散落著寫死的 'zh-TW'，切成英文之後日期仍會是中文格式，
 * 所以格式化也要走同一個語言來源。
 */
export function useFormat() {
    const locale = useLocaleContext().locale;
    const tag = LOCALE_TAGS[locale] ?? LOCALE_TAGS[DEFAULT_LOCALE];

    return React.useMemo(() => ({
        date: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
            new Date(value).toLocaleDateString(tag, options),
        number: (value: number, options?: Intl.NumberFormatOptions) =>
            value.toLocaleString(tag, options),
    }), [tag]);
}
