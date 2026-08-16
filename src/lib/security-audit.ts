/**
 * 安全審計日誌系統
 * 
 * 記錄所有安全相關事件，用於審計和調查
 */

import { logger } from './logger';

export type SecurityEventType =
    | 'rate_limit_exceeded'
    | 'csrf_validation_failed'
    | 'invalid_input_detected'
    | 'unauthorized_access_attempt'
    | 'suspicious_file_upload'
    | 'sql_injection_attempt'
    | 'xss_attempt'
    | 'authentication_failed'
    | 'privilege_escalation_attempt'
    | 'data_breach_attempt';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
    id: string;
    type: SecurityEventType;
    severity: SecuritySeverity;
    timestamp: string;
    ip?: string;
    userId?: string;
    action?: string;
    details?: Record<string, unknown>;
    blocked: boolean;
}

/** details 是任意結構的附加欄位，取出已知的字串欄位時需要窄化 */
function asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

class SecurityAuditLogger {
    private events: SecurityEvent[] = [];
    private maxEvents = 1000; // 保留最近 1000 個事件

    /**
     * 記錄安全事件
     */
    log(
        type: SecurityEventType,
        severity: SecuritySeverity,
        details?: Record<string, unknown>,
        blocked: boolean = true
    ): string {
        const eventId = this.generateEventId();

        const event: SecurityEvent = {
            id: eventId,
            type,
            severity,
            timestamp: new Date().toISOString(),
            ip: asString(details?.ip),
            userId: asString(details?.userId),
            action: asString(details?.action),
            details,
            blocked,
        };

        // 添加到事件列表
        this.events.unshift(event);

        // 保持列表大小
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(0, this.maxEvents);
        }

        // 記錄到日誌系統
        const logData = {
            eventId,
            type,
            severity,
            blocked,
            ...details,
        };

        switch (severity) {
            case 'critical':
                logger.fatal(logData, `SECURITY: ${type}`);
                break;
            case 'high':
                logger.error(logData, `SECURITY: ${type}`);
                break;
            case 'medium':
                logger.warn(logData, `SECURITY: ${type}`);
                break;
            case 'low':
                logger.info(logData, `SECURITY: ${type}`);
                break;
        }

        return eventId;
    }

    /**
     * 獲取最近的安全事件
     */
    getRecentEvents(limit = 50): SecurityEvent[] {
        return this.events.slice(0, limit);
    }

    /**
     * 根據類型獲取事件
     */
    getEventsByType(type: SecurityEventType, limit = 50): SecurityEvent[] {
        return this.events
            .filter(e => e.type === type)
            .slice(0, limit);
    }

    /**
     * 根據嚴重性獲取事件
     */
    getEventsBySeverity(severity: SecuritySeverity, limit = 50): SecurityEvent[] {
        return this.events
            .filter(e => e.severity === severity)
            .slice(0, limit);
    }

    /**
     * 根據 IP 獲取事件
     */
    getEventsByIp(ip: string, limit = 50): SecurityEvent[] {
        return this.events
            .filter(e => e.ip === ip)
            .slice(0, limit);
    }

    /**
     * 獲取統計資訊
     */
    getStats() {
        const total = this.events.length;

        const bySeverity = this.events.reduce((acc, event) => {
            acc[event.severity] = (acc[event.severity] || 0) + 1;
            return acc;
        }, {} as Record<SecuritySeverity, number>);

        const byType = this.events.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
        }, {} as Record<SecurityEventType, number>);

        const blocked = this.events.filter(e => e.blocked).length;
        const allowed = total - blocked;

        const last24Hours = this.events.filter(event => {
            const eventTime = new Date(event.timestamp).getTime();
            const now = Date.now();
            return now - eventTime < 24 * 60 * 60 * 1000;
        }).length;

        const lastHour = this.events.filter(event => {
            const eventTime = new Date(event.timestamp).getTime();
            const now = Date.now();
            return now - eventTime < 60 * 60 * 1000;
        }).length;

        return {
            total,
            bySeverity,
            byType,
            blocked,
            allowed,
            last24Hours,
            lastHour,
        };
    }

    /**
     * 檢查 IP 是否可疑
     * 基於最近的安全事件數量
     */
    isSuspiciousIp(ip: string, threshold = 10, timeWindowMs = 60 * 60 * 1000): boolean {
        const now = Date.now();
        const recentEvents = this.events.filter(event => {
            if (event.ip !== ip) return false;
            const eventTime = new Date(event.timestamp).getTime();
            return now - eventTime < timeWindowMs;
        });

        return recentEvents.length >= threshold;
    }

    /**
     * 清除所有事件
     */
    clear(): void {
        this.events = [];
        logger.info('Security audit log cleared');
    }

    /**
     * 生成唯一的事件 ID
     */
    private generateEventId(): string {
        return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// 導出單例實例
export const securityAudit = new SecurityAuditLogger();

/**
 * 便捷函數：記錄安全事件
 */
export function logSecurityEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    details?: Record<string, unknown>,
    blocked: boolean = true
): string {
    return securityAudit.log(type, severity, details, blocked);
}

/**
 * 便捷函數：記錄關鍵安全事件
 */
export function logCriticalSecurityEvent(
    type: SecurityEventType,
    details?: Record<string, unknown>
): string {
    return securityAudit.log(type, 'critical', details, true);
}

/**
 * 便捷函數：記錄高嚴重性安全事件
 */
export function logHighSecurityEvent(
    type: SecurityEventType,
    details?: Record<string, unknown>
): string {
    return securityAudit.log(type, 'high', details, true);
}
