/**
 * CSRF Token 工具
 *
 * 目前的 CSRF 防護實際上由兩層提供：
 * 1. Server Actions —— Next.js 內建的 Origin/Host 驗證
 * 2. Route Handlers —— middleware.ts 對會改變狀態的 /api 請求做同源檢查
 *
 * 這個模組保留「明確發放並驗證 token」的能力，供未來需要更強保護的端點使用。
 *
 * 注意：本模組先前提供的雙重提交 Cookie 模式無法運作 —— Cookie 設了 httpOnly，
 * 前端 JS 永遠讀不到它，因此不可能把 token 放進請求標頭。若要啟用雙重提交，
 * 必須改用非 httpOnly 的 Cookie，並由前端主動附帶標頭。
 */

import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * 生成 CSRF Token
 */
export function generateCsrfToken(): string {
    return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * 設定 CSRF Token 到 Cookie
 */
export async function setCsrfToken(): Promise<string> {
    const token = generateCsrfToken();
    const cookieStore = await cookies();

    cookieStore.set(CSRF_TOKEN_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
    });

    return token;
}

/**
 * 獲取當前的 CSRF Token
 */
export async function getCsrfToken(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(CSRF_TOKEN_NAME)?.value;
}

/**
 * 驗證 CSRF Token
 * @param headerToken 從請求標頭獲取的 token
 * @returns true 如果驗證通過
 */
export async function verifyCsrfToken(headerToken: string | null): Promise<boolean> {
    if (!headerToken) {
        return false;
    }

    const cookieToken = await getCsrfToken();

    if (!cookieToken) {
        return false;
    }

    const headerBuffer = Buffer.from(headerToken);
    const cookieBuffer = Buffer.from(cookieToken);

    // timingSafeEqual 在長度不同時會拋 RangeError，必須先比長度再比內容。
    // 長度本身不是機密，提前返回不會洩漏額外資訊。
    if (headerBuffer.length !== cookieBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(headerBuffer, cookieBuffer);
}

export { CSRF_TOKEN_NAME, CSRF_HEADER_NAME };
