'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/context';
import { Shield, AlertTriangle, Activity, RefreshCw, Ban } from 'lucide-react';
import type { SecurityEvent } from '@/lib/security-audit';

interface SecurityStats {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    blocked: number;
    allowed: number;
    last24Hours: number;
    lastHour: number;
}

export function SecurityDashboard() {
    const t = useT();
    const [events, setEvents] = React.useState<SecurityEvent[]>([]);
    const [stats, setStats] = React.useState<SecurityStats | null>(null);
    const [loading, setLoading] = React.useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/security/audit');
            if (response.ok) {
                const data = await response.json();
                setEvents(data.events || []);
                setStats(data.stats || null);
            }
        } catch (error) {
            console.error('Failed to fetch security data:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
        // 每 30 秒自動刷新
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-600';
            case 'high':
                return 'bg-orange-500';
            case 'medium':
                return 'bg-yellow-500';
            case 'low':
                return 'bg-blue-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'rate_limit_exceeded': t("security.eventRateLimit"),
            'csrf_validation_failed': t("security.eventCsrf"),
            'invalid_input_detected': t("security.eventInvalidInput"),
            'unauthorized_access_attempt': t("security.eventUnauthorized"),
            'suspicious_file_upload': t("security.eventSuspiciousUpload"),
            'sql_injection_attempt': t("security.eventSqlInjection"),
            'xss_attempt': t("security.eventXss"),
            'authentication_failed': t("security.eventAuthFailed"),
            'privilege_escalation_attempt': t("security.eventPrivilegeEscalation"),
            'data_breach_attempt': t("security.eventDataBreach"),
        };
        return labels[type] || type;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t("security.title")}</h2>
                    <p className="text-muted-foreground">{t("security.description")}</p>
                </div>
                <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {t("security.refresh")}
                </Button>
            </div>

            {/* 統計卡片 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("security.totalEvents")}</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {t("security.blocked")}: {stats?.blocked || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("security.last24h")}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.last24Hours || 0}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {t("security.lastHour")}: {stats?.lastHour || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("security.criticalEvents")}</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {stats?.bySeverity?.critical || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {t("security.highSeverity")}: {stats?.bySeverity?.high || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("security.blockRate")}</CardTitle>
                        <Ban className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.total ? ((stats.blocked / stats.total) * 100).toFixed(1) : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {stats?.blocked || 0} / {stats?.total || 0}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 嚴重性分布 */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("security.severityDistribution")}</CardTitle>
                    <CardDescription>{t("security.severityDistributionDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {['critical', 'high', 'medium', 'low'].map((severity) => (
                            <div key={severity} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity)}`} />
                                    <span className="text-sm capitalize">{severity}</span>
                                </div>
                                <Badge variant="outline">
                                    {stats?.bySeverity?.[severity] || 0}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 最近事件 */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("security.recentEvents")}</CardTitle>
                    <CardDescription>{t("security.recentEventsDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {events.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                {t("security.empty")}
                            </p>
                        ) : (
                            events.slice(0, 10).map((event) => (
                                <div
                                    key={event.id}
                                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <Badge className={getSeverityColor(event.severity)}>
                                                {event.severity}
                                            </Badge>
                                            <span className="text-sm font-medium">
                                                {getTypeLabel(event.type)}
                                            </span>
                                            {event.blocked && (
                                                <Badge variant="outline" className="text-green-600">
                                                    {t("security.blocked")}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            {event.ip && <div>IP: {event.ip}</div>}
                                            {event.action && <div>{t("security.action")}: {event.action}</div>}
                                            <div>
                                                {t("security.time")}: {new Date(event.timestamp).toLocaleString('zh-TW')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 事件類型分布 */}
            {stats?.byType && Object.keys(stats.byType).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("security.typeDistribution")}</CardTitle>
                        <CardDescription>{t("security.typeDistributionDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(stats.byType)
                                .sort(([, a], [, b]) => b - a)
                                .map(([type, count]) => (
                                    <div key={type} className="flex items-center justify-between">
                                        <span className="text-sm">{getTypeLabel(type)}</span>
                                        <Badge variant="secondary">{count}</Badge>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
