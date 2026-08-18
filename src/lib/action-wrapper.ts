/**
 * Action Wrapper - 統一的 Server Action 錯誤處理機制
 * 
 * 提供一致的錯誤處理、日誌記錄和回傳格式
 */

/**
 * 統一的 Action 回傳格式
 */
export type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

/**
 * 錯誤處理 Wrapper
 * 
 * @param action - 要執行的異步操作
 * @param context - 操作的上下文名稱（用於日誌）
 * @returns 統一格式的結果
 * 
 * @example
 * ```typescript
 * export async function createInvoice(data: InvoiceData) {
 *   return withErrorHandling(
 *     async () => {
 *       const invoice = await prisma.invoice.create({ data });
 *       revalidatePath("/invoicing");
 *       return invoice;
 *     },
 *     "createInvoice"
 *   );
 * }
 * ```
 */
import { headers } from "next/headers";
import { checkRateLimit } from "./rate-limit";
import { logger, logActionStart, logActionSuccess, logActionError, logSecurityEvent } from "./logger";
import { trackError } from "./error-tracker";



export async function withErrorHandling<T>(
    action: () => Promise<T>,
    context: string
): Promise<ActionResult<T>> {
    const startTime = Date.now();

    // Rate Limiting
    //
    // middleware.ts 已經對每個請求（含 Server Action 的 POST）按 IP 做過限流，
    // 這裡只在真的能辨識出來源 IP 時才額外把關。
    // 原本取不到 x-forwarded-for 時會退回字面值 "unknown"，導致所有無代理的請求
    // 共用同一個 60 次/分鐘的配額 —— 單機桌面情境下，批次對帳很容易誤觸。
    try {
        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
            || headersList.get("x-real-ip")
            || null;

        if (ip && !checkRateLimit(ip, 60, 60000)) {
            logSecurityEvent('rate_limit_exceeded', 'medium', { action: context, ip });

            // 追蹤速率限制錯誤
            trackError(
                'Rate limit exceeded',
                { action: context, metadata: { ip } },
                'medium'
            );

            return { success: false, error: "請求過於頻繁，請稍後再試" };
        }
    } catch (e) {
        // Ignore header errors in non-request contexts (e.g. tests)
        logger.debug({ error: e }, "Failed to check rate limit");
    }

    try {
        logActionStart(context);

        const data = await action();

        const duration = Date.now() - startTime;
        logActionSuccess(context, duration);

        return { success: true, data };
    } catch (error) {
        const duration = Date.now() - startTime;

        // 詳細的錯誤日誌
        logActionError(
            context,
            error instanceof Error ? error : new Error(String(error)),
            duration
        );

        // 追蹤錯誤到錯誤追蹤系統
        const errorInstance = error instanceof Error ? error : new Error(String(error));

        // 根據錯誤類型決定嚴重性
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

        if (errorInstance.name === 'ValidationError') {
            severity = 'low';
        } else if (errorInstance.name === 'DatabaseError') {
            severity = 'high';
        } else if (errorInstance.name === 'AuthorizationError') {
            severity = 'high';
        } else if (errorInstance.message.includes('ECONNREFUSED') ||
            errorInstance.message.includes('timeout')) {
            severity = 'critical';
        }

        trackError(
            errorInstance,
            {
                action: context,
                metadata: { duration }
            },
            severity
        );

        // 回傳用戶友善的錯誤訊息
        const errorMessage = error instanceof Error
            ? error.message
            : "操作失敗，請稍後再試";

        return { success: false, error: errorMessage };
    }
}

/**
 * 帶有資料驗證的錯誤處理 Wrapper
 * 
 * @param action - 要執行的異步操作
 * @param context - 操作的上下文名稱
 * @param validator - Zod schema 驗證器
 * @param rawData - 要驗證的原始資料
 * @returns 統一格式的結果
 * 
 * @example
 * ```typescript
 * export async function createInvoice(rawData: unknown) {
 *   return withValidation(
 *     async (validatedData) => {
 *       const invoice = await prisma.invoice.create({ data: validatedData });
 *       return invoice;
 *     },
 *     "createInvoice",
 *     createInvoiceSchema,
 *     rawData
 *   );
 * }
 * ```
 */
export async function withValidation<TInput, TOutput>(
    action: (validatedData: TInput) => Promise<TOutput>,
    context: string,
    validator: { parse: (data: unknown) => TInput },
    rawData: unknown
): Promise<ActionResult<TOutput>> {
    return withErrorHandling(async () => {
        let validatedData: TInput;
        try {
            validatedData = validator.parse(rawData);
        } catch (error) {
            // Zod 的 error.message 是一整包 JSON，直接回傳的話使用者會在
            // toast 裡看到 [{"code":"too_small",...}]。轉成「欄位：訊息」，
            // 並把 schema 裡存的文案鍵翻成目前語言的文字。
            throw new ValidationError(await formatValidationError(error));
        }

        return await action(validatedData);
    }, context);
}

/** Zod 的 issue 陣列 —— 只取實際會用到的欄位，不引入 zod 的型別 */
interface ValidationIssue {
    path?: (string | number)[];
    message?: string;
}

function isZodError(error: unknown): error is { issues: ValidationIssue[] } {
    return (
        typeof error === "object" && error !== null && "issues" in error &&
        Array.isArray((error as { issues: unknown }).issues)
    );
}

async function formatValidationError(error: unknown): Promise<string> {
    if (!isZodError(error)) {
        return error instanceof Error ? error.message : "Validation failed";
    }

    const { getT } = await import("./i18n/server");
    const t = await getT();

    return error.issues
        .map((issue) => {
            const field = issue.path?.join(".") ?? "";
            // schema 存的是文案鍵；查不到時 translate() 會原樣回傳，
            // 對於 zod 內建的英文訊息剛好也是正確行為
            const message = issue.message
                ? t(issue.message as Parameters<typeof t>[0])
                : "";
            return field ? `${field}: ${message}` : message;
        })
        .filter(Boolean)
        .join("; ");
}

/**
 * 錯誤類型定義
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

export class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DatabaseError";
    }
}

export class AuthorizationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AuthorizationError";
    }
}

/**
 * 檢查 ActionResult 是否成功
 */
export function isSuccess<T>(result: ActionResult<T>): result is { success: true; data: T } {
    return result.success === true;
}

/**
 * 檢查 ActionResult 是否失敗
 */
export function isError<T>(result: ActionResult<T>): result is { success: false; error: string } {
    return result.success === false;
}
