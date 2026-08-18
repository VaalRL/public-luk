/**
 * 介面語言設定
 *
 * 為什麼是自己寫而不是用 next-intl 之類的套件：
 * 這個專案的 xlsx 相依指向 SheetJS 官方 CDN，在擋住該網域的網路環境下
 * `npm install` 會整個失敗，等於不能再新增任何相依套件。
 * 需要的功能（字典查表 + 變數代入 + 偏好持久化）大約一百行就能寫完，
 * 沒有必要為此讓安裝流程更脆弱。
 */

export const LOCALES = ["zh-TW", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** 這是一套為台灣會計實務寫的工具，預設語言就是繁體中文 */
export const DEFAULT_LOCALE: Locale = "zh-TW";

/**
 * 語言偏好存在 cookie 而非 localStorage：
 * server component 也要知道語言（<html lang>、伺服器端算好的頁面文字），
 * localStorage 在伺服器端讀不到。
 */
export const LOCALE_COOKIE = "luk-locale";

/** cookie 存一年，這種偏好不需要常常重設 */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** 各語言在切換選單上的顯示名稱，一律以該語言自己的寫法呈現 */
export const LOCALE_LABELS: Record<Locale, string> = {
    "zh-TW": "繁體中文",
    en: "English",
};

/** 給 <html lang> 與 Intl 用的 BCP 47 標籤 */
export const LOCALE_TAGS: Record<Locale, string> = {
    "zh-TW": "zh-TW",
    en: "en",
};
