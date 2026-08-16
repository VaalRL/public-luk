/**
 * 輸入清理和驗證工具
 * 
 * 提供各種輸入清理功能以防止安全漏洞：
 * - XSS (Cross-Site Scripting) 防護
 * - SQL 注入防護 (Prisma 已提供，這裡提供額外驗證)
 * - 路徑遍歷防護
 * - 命令注入防護
 */

/**
 * HTML 特殊字符轉義
 * 防止 XSS 攻擊
 */
export function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * 移除 HTML 標籤
 * 用於純文字輸入
 */
export function stripHtmlTags(text: string): string {
    return text.replace(/<[^>]*>/g, '');
}

/**
 * 清理檔案名稱
 * 防止路徑遍歷攻擊
 */
export function sanitizeFilename(filename: string): string {
    // 移除路徑分隔符和特殊字符
    return filename
        .replace(/[\/\\]/g, '')
        .replace(/\.\./g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .substring(0, 255); // 限制長度
}

/**
 * 驗證電子郵件格式
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * 驗證 URL 格式
 * 只允許 http 和 https 協議
 */
export function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * 清理 URL
 * 防止 JavaScript 協議和其他危險協議
 */
export function sanitizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return 'about:blank';
        }
        return url;
    } catch {
        return 'about:blank';
    }
}

/**
 * 驗證 UUID 格式
 */
export function isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * 清理數字輸入
 * 確保輸入是有效的數字
 */
export function sanitizeNumber(value: unknown): number | null {
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && isFinite(parsed)) {
            return parsed;
        }
    }

    return null;
}

/**
 * 清理整數輸入
 */
export function sanitizeInteger(value: unknown, min?: number, max?: number): number | null {
    const num = sanitizeNumber(value);

    if (num === null || !Number.isInteger(num)) {
        return null;
    }

    if (min !== undefined && num < min) {
        return null;
    }

    if (max !== undefined && num > max) {
        return null;
    }

    return num;
}

/**
 * 清理字串長度
 * 防止過長的輸入導致的問題
 */
export function limitStringLength(text: string, maxLength: number = 1000): string {
    return text.substring(0, maxLength);
}

/**
 * 驗證日期格式
 */
export function isValidDate(date: unknown): boolean {
    if (date instanceof Date) {
        return !isNaN(date.getTime());
    }

    if (typeof date === 'string' || typeof date === 'number') {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
    }

    return false;
}

/**
 * 清理物件屬性
 * 移除 undefined 和 null 值
 */
export function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const cleaned: Partial<T> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
            cleaned[key as keyof T] = value as T[keyof T];
        }
    }

    return cleaned;
}

/**
 * 驗證並清理 JSON 字串
 */
export function sanitizeJson(jsonString: string, maxLength: number = 10000): unknown {
    if (jsonString.length > maxLength) {
        return null;
    }

    try {
        return JSON.parse(jsonString);
    } catch {
        return null;
    }
}

/**
 * 防止 NoSQL 注入
 * 檢查物件中是否包含操作符
 */
export function hasNoSqlInjection(obj: unknown): boolean {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }

    const dangerousKeys = ['$where', '$regex', '$ne', '$gt', '$lt', '$gte', '$lte', '$in', '$nin'];

    const record = obj as Record<string, unknown>;

    for (const key of Object.keys(record)) {
        if (dangerousKeys.includes(key)) {
            return true;
        }

        if (typeof record[key] === 'object' && hasNoSqlInjection(record[key])) {
            return true;
        }
    }

    return false;
}

/**
 * 清理搜尋查詢
 * 移除特殊字符，防止注入攻擊
 */
export function sanitizeSearchQuery(query: string): string {
    return query
        .replace(/[^\w\s\u4e00-\u9fa5]/g, '') // 只保留字母、數字、空格和中文
        .trim()
        .substring(0, 100); // 限制長度
}

/**
 * 驗證檔案類型
 * 基於副檔名和 MIME 類型
 */
export function isValidFileType(
    filename: string,
    allowedExtensions: string[],
    mimeType?: string
): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (!ext || !allowedExtensions.includes(ext)) {
        return false;
    }

    // 如果提供了 MIME 類型，也進行驗證
    if (mimeType) {
        const validMimeTypes: Record<string, string[]> = {
            'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            'xls': ['application/vnd.ms-excel'],
            'csv': ['text/csv', 'application/csv'],
            'pdf': ['application/pdf'],
            'png': ['image/png'],
            'jpg': ['image/jpeg'],
            'jpeg': ['image/jpeg'],
        };

        const allowedMimes = validMimeTypes[ext];
        if (allowedMimes && !allowedMimes.includes(mimeType)) {
            return false;
        }
    }

    return true;
}

/**
 * 驗證檔案大小
 */
export function isValidFileSize(sizeInBytes: number, maxSizeInMB: number = 10): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return sizeInBytes > 0 && sizeInBytes <= maxSizeInBytes;
}

/**
 * 綜合輸入清理函數
 * 用於一般文字輸入
 */
export function sanitizeInput(
    input: string,
    options: {
        stripHtml?: boolean;
        maxLength?: number;
        escapeHtml?: boolean;
    } = {}
): string {
    let result = input;

    // 移除 HTML 標籤
    if (options.stripHtml) {
        result = stripHtmlTags(result);
    }

    // 限制長度
    if (options.maxLength) {
        result = limitStringLength(result, options.maxLength);
    }

    // 轉義 HTML
    if (options.escapeHtml) {
        result = escapeHtml(result);
    }

    return result.trim();
}
