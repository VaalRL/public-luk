import { NextResponse } from 'next/server';
import { securityAudit } from '@/lib/security-audit';
import type { SecurityEventType, SecuritySeverity } from '@/lib/security-audit';

/**
 * 安全審計端點
 * 
 * GET /api/security/audit - 獲取安全事件列表
 * GET /api/security/audit?stats=true - 獲取統計資訊
 * GET /api/security/audit?type=xxx - 按類型篩選
 * GET /api/security/audit?severity=xxx - 按嚴重性篩選
 * GET /api/security/audit?ip=xxx - 按 IP 篩選
 * DELETE /api/security/audit - 清除審計日誌
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === 'true';
    const type = searchParams.get('type') as SecurityEventType | null;
    const severity = searchParams.get('severity') as SecuritySeverity | null;
    const ip = searchParams.get('ip');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        // 只獲取統計
        if (statsOnly) {
            const stats = securityAudit.getStats();
            return NextResponse.json(stats);
        }

        // 按類型篩選
        if (type) {
            const events = securityAudit.getEventsByType(type, limit);
            return NextResponse.json({ events, count: events.length });
        }

        // 按嚴重性篩選
        if (severity) {
            const events = securityAudit.getEventsBySeverity(severity, limit);
            return NextResponse.json({ events, count: events.length });
        }

        // 按 IP 篩選
        if (ip) {
            const events = securityAudit.getEventsByIp(ip, limit);
            const isSuspicious = securityAudit.isSuspiciousIp(ip);
            return NextResponse.json({
                events,
                count: events.length,
                isSuspicious
            });
        }

        // 獲取最近的事件和統計
        const events = securityAudit.getRecentEvents(limit);
        const stats = securityAudit.getStats();

        return NextResponse.json({
            events,
            stats,
        });
    } catch (error) {
        console.error('Failed to retrieve security audit data:', error);

        return NextResponse.json(
            { error: 'Failed to retrieve security audit data' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/security/audit - 清除審計日誌
 */
export async function DELETE() {
    try {
        securityAudit.clear();
        return NextResponse.json({ message: 'Security audit log cleared' });
    } catch {
        return NextResponse.json(
            { error: 'Failed to clear security audit log' },
            { status: 500 }
        );
    }
}
