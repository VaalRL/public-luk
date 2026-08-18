/**
 * 伺服器端取得語言與文案
 *
 * server component（頁面標題、layout 的 <html lang>）不能用 React context，
 * 直接從 cookie 讀。
 *
 * 注意：這個模組只能在伺服器端使用。專案沒有裝 server-only 套件
 * （xlsx 相依讓 npm install 無法新增套件），誤用時會由 next/headers
 * 自己丟出錯誤。
 */

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getMessages, translate, type MessageKey } from "./messages";

export async function getLocale(): Promise<Locale> {
    try {
        const store = await cookies();
        const value = store.get(LOCALE_COOKIE)?.value;
        return isLocale(value) ? value : DEFAULT_LOCALE;
    } catch {
        // 靜態渲染等取不到 cookie 的情境，用預設語言即可
        return DEFAULT_LOCALE;
    }
}

/** 伺服器端的 t()：`const t = await getT(); t("dashboard.title")` */
export async function getT(): Promise<
    (key: MessageKey, vars?: Record<string, string | number>) => string
> {
    const messages = getMessages(await getLocale());
    return (key, vars) => translate(messages, key, vars);
}
