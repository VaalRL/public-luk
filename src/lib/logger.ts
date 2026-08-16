/**
 * 結構化日誌工具
 * 
 * 簡單的日誌包裝器，在開發環境提供詳細日誌，生產環境提供結構化 JSON 日誌
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isServer = typeof window === 'undefined';

// 日誌級別
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** 結構化日誌的內容：物件會被展開成欄位，其他型別會放進 data 欄位 */
export type LogPayload = Record<string, unknown> | unknown;

// 日誌接口
interface Logger {
    info: (obj: LogPayload, msg?: string) => void;
    error: (obj: LogPayload, msg?: string) => void;
    warn: (obj: LogPayload, msg?: string) => void;
    debug: (obj: LogPayload, msg?: string) => void;
    fatal: (obj: LogPayload, msg?: string) => void;
}

// 格式化日誌輸出
function formatLog(level: LogLevel, obj: LogPayload, msg?: string): string {
    const timestamp = new Date().toISOString();
    const logData = {
        level,
        time: timestamp,
        ...(typeof obj === 'object' && obj !== null ? obj : { data: obj }),
        ...(msg ? { msg } : {}),
    };

    if (isDevelopment) {
        // 開發環境：美化輸出
        const levelColors: Record<LogLevel, string> = {
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m',  // Green
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m', // Red
            fatal: '\x1b[35m', // Magenta
        };
        const reset = '\x1b[0m';
        const color = levelColors[level];

        return `${color}[${timestamp}] ${level.toUpperCase()}${reset}: ${msg || ''} ${JSON.stringify(obj, null, 2)}`;
    } else {
        // 生產環境：JSON 格式
        return JSON.stringify(logData);
    }
}

// 創建 logger
function createLogger(): Logger {
    const log = (level: LogLevel, obj: LogPayload, msg?: string) => {
        if (!isServer && !isDevelopment) {
            // 客戶端生產環境不輸出日誌
            return;
        }

        const formatted = formatLog(level, obj, msg);

        switch (level) {
            case 'debug':
                if (isDevelopment) console.debug(formatted);
                break;
            case 'info':
                console.log(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            case 'error':
            case 'fatal':
                console.error(formatted);
                break;
        }
    };

    return {
        info: (obj: LogPayload, msg?: string) => log('info', obj, msg),
        error: (obj: LogPayload, msg?: string) => log('error', obj, msg),
        warn: (obj: LogPayload, msg?: string) => log('warn', obj, msg),
        debug: (obj: LogPayload, msg?: string) => log('debug', obj, msg),
        fatal: (obj: LogPayload, msg?: string) => log('fatal', obj, msg),
    };
}

export const logger = createLogger();

/**
 * 日誌輔助函數
 */

// 記錄 Server Action 開始
export function logActionStart(actionName: string, context?: Record<string, unknown>) {
    logger.info({ action: actionName, ...context }, `Action started: ${actionName}`);
}

// 記錄 Server Action 成功
export function logActionSuccess(actionName: string, duration: number, context?: Record<string, unknown>) {
    logger.info({ action: actionName, duration, ...context }, `Action completed: ${actionName} (${duration}ms)`);
}

// 記錄 Server Action 失敗
export function logActionError(actionName: string, error: Error, duration: number, context?: Record<string, unknown>) {
    logger.error({
        action: actionName,
        duration,
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
        },
        ...context
    }, `Action failed: ${actionName} (${duration}ms)`);
}

// 記錄資料庫查詢
export function logDatabaseQuery(query: string, duration: number, context?: Record<string, unknown>) {
    logger.debug({ query, duration, ...context }, `Database query executed (${duration}ms)`);
}

// 記錄安全事件
export function logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', context?: Record<string, unknown>) {
    const logFn = severity === 'high' ? logger.error : severity === 'medium' ? logger.warn : logger.info;
    logFn({ event, severity, ...context }, `Security event: ${event}`);
}

// 記錄效能指標
export function logPerformanceMetric(metric: string, value: number, unit: string, context?: Record<string, unknown>) {
    logger.info({ metric, value, unit, ...context }, `Performance: ${metric} = ${value}${unit}`);
}
