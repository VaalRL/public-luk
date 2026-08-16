import { logger } from './logger';

/**
 * 錯誤追蹤工具
 * 
 * 提供統一的錯誤處理和追蹤功能
 * 未來可整合 Sentry 或其他錯誤追蹤服務
 */

export interface ErrorContext {
    userId?: string;
    action?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
}

export interface TrackedError {
    id: string;
    message: string;
    stack?: string;
    context?: ErrorContext;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorTracker {
    private errors: TrackedError[] = [];
    private maxErrors = 100; // 保留最近 100 個錯誤

    /**
     * 追蹤錯誤
     */
    track(
        error: Error | string,
        context?: ErrorContext,
        severity: TrackedError['severity'] = 'medium'
    ): string {
        const errorId = this.generateErrorId();
        const message = typeof error === 'string' ? error : error.message;
        const stack = typeof error === 'string' ? undefined : error.stack;

        const trackedError: TrackedError = {
            id: errorId,
            message,
            stack,
            context,
            timestamp: new Date().toISOString(),
            severity,
        };

        // 添加到錯誤列表
        this.errors.unshift(trackedError);

        // 保持列表大小
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }

        // 記錄到日誌
        const logData = {
            errorId,
            message,
            severity,
            context,
            stack,
        };

        switch (severity) {
            case 'critical':
                logger.fatal(logData, 'Critical error occurred');
                break;
            case 'high':
                logger.error(logData, 'High severity error occurred');
                break;
            case 'medium':
                logger.warn(logData, 'Medium severity error occurred');
                break;
            case 'low':
                logger.info(logData, 'Low severity error occurred');
                break;
        }

        return errorId;
    }

    /**
     * 獲取最近的錯誤
     */
    getRecentErrors(limit = 10): TrackedError[] {
        return this.errors.slice(0, limit);
    }

    /**
     * 根據 ID 獲取錯誤
     */
    getErrorById(id: string): TrackedError | undefined {
        return this.errors.find(e => e.id === id);
    }

    /**
     * 獲取錯誤統計
     */
    getStats() {
        const total = this.errors.length;
        const bySeverity = this.errors.reduce((acc, error) => {
            acc[error.severity] = (acc[error.severity] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const last24Hours = this.errors.filter(error => {
            const errorTime = new Date(error.timestamp).getTime();
            const now = Date.now();
            return now - errorTime < 24 * 60 * 60 * 1000;
        }).length;

        return {
            total,
            bySeverity,
            last24Hours,
        };
    }

    /**
     * 清除所有錯誤
     */
    clear(): void {
        this.errors = [];
        logger.info('Error tracker cleared');
    }

    /**
     * 生成唯一的錯誤 ID
     */
    private generateErrorId(): string {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// 導出單例實例
export const errorTracker = new ErrorTracker();

/**
 * 便捷函數：追蹤錯誤
 */
export function trackError(
    error: Error | string,
    context?: ErrorContext,
    severity?: TrackedError['severity']
): string {
    return errorTracker.track(error, context, severity);
}

/**
 * 便捷函數：追蹤關鍵錯誤
 */
export function trackCriticalError(
    error: Error | string,
    context?: ErrorContext
): string {
    return errorTracker.track(error, context, 'critical');
}

/**
 * 便捷函數：追蹤高嚴重性錯誤
 */
export function trackHighError(
    error: Error | string,
    context?: ErrorContext
): string {
    return errorTracker.track(error, context, 'high');
}
