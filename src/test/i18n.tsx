/**
 * 測試用的語言環境
 *
 * 用到 useT() 的元件必須在 LocaleProvider 之內才能渲染。
 * 元件測試想驗的是元件本身，不該為了語言而各自組裝 provider，
 * 所以統一從這裡 render。
 */

import React from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { LocaleProvider } from "@/lib/i18n/context";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

export function renderWithLocale(
    ui: React.ReactElement,
    { locale = DEFAULT_LOCALE, ...options }: RenderOptions & { locale?: Locale } = {}
): RenderResult {
    return render(ui, {
        wrapper: ({ children }) => <LocaleProvider locale={locale}>{children}</LocaleProvider>,
        ...options,
    });
}
