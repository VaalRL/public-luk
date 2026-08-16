'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
            'rate_limit_exceeded': '速率限制超出',
            'csrf_validation_failed': 'CSRF 驗證失敗',
            'invalid_input_detected': '無效輸入檢測',
            'unauthorized_access_attempt': '未授權訪問嘗試',
            'suspicious_file_upload': '可疑檔案上傳',
            'sql_injection_attempt': 'SQL 注入嘗試',
            'xss_attempt': 'XSS 攻擊嘗試',
            'authentication_failed': '認證失敗',
            'privilege_escalation_attempt': '權限提升嘗試',
            'data_breach_attempt': '資料洩露嘗試',
        };
        return labels[type] || type;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">安全儀表板</h2>
                    <p className="text-muted-foreground">監控系統安全事件和威脅</p>
                </div>
                <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    刷新
                </Button>
            </div>

            {/* 統計卡片 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">總事件數</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            已阻擋: {stats?.blocked || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">過去 24 小時</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.last24Hours || 0}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            過去 1 小時: {stats?.lastHour || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">關鍵事件</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {stats?.bySeverity?.critical || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            高嚴重性: {stats?.bySeverity?.high || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">阻擋率</CardTitle>
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
                    <CardTitle>事件嚴重性分布</CardTitle>
                    <CardDescription>按嚴重性分類的安全事件</CardDescription>
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
                    <CardTitle>最近安全事件</CardTitle>
                    <CardDescription>最近 50 個安全相關事件</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {events.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                暫無安全事件
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
                                                    已阻擋
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            {event.ip && <div>IP: {event.ip}</div>}
                                            {event.action && <div>動作: {event.action}</div>}
                                            <div>
                                                時間: {new Date(event.timestamp).toLocaleString('zh-TW')}
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
                        <CardTitle>事件類型分布</CardTitle>
                        <CardDescription>各類安全事件的數量</CardDescription>
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
