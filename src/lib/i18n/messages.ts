/**
 * 文案字典與查表
 *
 * zh-TW 是基準：Messages 型別由它推導出來，其他語言少一個鍵就編譯不過。
 */

import { zhTW } from "./messages/zh-TW";
import { en } from "./messages/en";
import { DEFAULT_LOCALE, type Locale } from "./config";

/** 把 as const 推導出的字面值型別放寬成 string，其他語言才填得進去 */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof zhTW>;

export const messagesByLocale: Record<Locale, Messages> = {
    "zh-TW": zhTW,
    en,
};

export function getMessages(locale: Locale): Messages {
    return messagesByLocale[locale] ?? messagesByLocale[DEFAULT_LOCALE];
}

/**
 * 文案鍵值：`"nav.dashboard"` 這種點分路徑，型別上只接受真的存在的路徑。
 * 打錯字在編譯期就會被抓到，而不是在畫面上看到一串鍵名。
 */
export type MessageKey = LeafPaths<Messages>;

type LeafPaths<T> = T extends string
    ? never
    : {
        [K in keyof T & string]: T[K] extends string ? K : `${K}.${LeafPaths<T[K]>}`;
    }[keyof T & string];

/**
 * 依點分路徑取出文案，並代入 {變數}。
 *
 * 查不到時回傳鍵名本身 —— 畫面上會看到 `nav.dashboard` 這種字串，
 * 一眼就知道是漏翻，比顯示空白好追。
 */
export function translate(
    messages: Messages,
    key: string,
    vars?: Record<string, string | number>
): string {
    let node: unknown = messages;
    for (const part of key.split(".")) {
        if (typeof node !== "object" || node === null) return key;
        node = (node as Record<string, unknown>)[part];
    }
    if (typeof node !== "string") return key;
    if (!vars) return node;

    return node.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match
    );
}
