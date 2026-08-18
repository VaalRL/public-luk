'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/context';
import { Activity, AlertCircle, CheckCircle, Clock, Database, RefreshCw, TrendingUp } from 'lucide-react';

interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    checks: {
        database: {
            status: string;
            responseTime: number;
        };
        api: {
            status: string;
        };
    };
    environment: string;
}

interface PerformanceMetrics {
    uptime: number;
    timestamp: string;
    memory: {
        heapUsed: string;
        heapTotal: string;
        rss: string;
        external: string;
    };
    process: {
        pid: number;
        nodeVersion: string;
        platform: string;
    };
}

interface ErrorStats {
    total: number;
    bySeverity: Record<string, number>;
    last24Hours: number;
}

export function SystemMonitor() {
    const t = useT();
    const [health, setHealth] = React.useState<HealthStatus | null>(null);
    const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);
    const [errorStats, setErrorStats] = React.useState<ErrorStats | null>(null);
    const [loading, setLoading] = React.useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [healthRes, metricsRes, errorsRes] = await Promise.all([
                fetch('/api/health'),
                fetch('/api/metrics'),
                fetch('/api/errors?stats=true'),
            ]);

            if (healthRes.ok) setHealth(await healthRes.json());
            if (metricsRes.ok) setMetrics(await metricsRes.json());
            if (errorsRes.ok) setErrorStats(await errorsRes.json());
        } catch (error) {
            console.error('Failed to fetch monitoring data:', error);
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

    const formatUptime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t("monitor.title")}</h2>
                    <p className="text-muted-foreground">{t("monitor.description")}</p>
                </div>
                <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {t("monitor.refresh")}
                </Button>
            </div>

            {/* 健康狀態 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("monitor.systemStatus")}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            {health?.status === 'healthy' ? (
                                <>
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <Badge variant="default" className="bg-green-500">{t("monitor.healthy")}</Badge>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <Badge variant="destructive">{t("monitor.unhealthy")}</Badge>
                                </>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {t("monitor.environment")}: {health?.environment || 'N/A'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("monitor.database")}</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            {health?.checks.database.status === 'connected' ? (
                                <>
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <Badge variant="default" className="bg-green-500">{t("monitor.connected")}</Badge>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <Badge variant="destructive">{t("monitor.disconnected")}</Badge>
                                </>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {t("monitor.responseTime")}: {health?.checks.database.responseTime || 0}ms
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("monitor.uptime")}</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metrics ? formatUptime(metrics.uptime) : 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            PID: {metrics?.process.pid || 'N/A'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("monitor.errorCount")}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {errorStats?.last24Hours || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {t("monitor.last24h")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 詳細指標 */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("monitor.memory")}</CardTitle>
                        <CardDescription>{t("monitor.memoryDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Heap Used:</span>
                            <span className="text-sm font-medium">{metrics?.memory.heapUsed || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Heap Total:</span>
                            <span className="text-sm font-medium">{metrics?.memory.heapTotal || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">RSS:</span>
                            <span className="text-sm font-medium">{metrics?.memory.rss || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">External:</span>
                            <span className="text-sm font-medium">{metrics?.memory.external || 'N/A'}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("monitor.errorsByType")}</CardTitle>
                        <CardDescription>{t("monitor.errorsByTypeDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Critical:</span>
                            <Badge variant="destructive">{errorStats?.bySeverity.critical || 0}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">High:</span>
                            <Badge variant="destructive" className="bg-orange-500">{errorStats?.bySeverity.high || 0}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Medium:</span>
                            <Badge variant="secondary">{errorStats?.bySeverity.medium || 0}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Low:</span>
                            <Badge variant="outline">{errorStats?.bySeverity.low || 0}</Badge>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm font-medium">Total:</span>
                            <span className="text-sm font-bold">{errorStats?.total || 0}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 系統資訊 */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("monitor.systemInfo")}</CardTitle>
                    <CardDescription>{t("monitor.systemInfoDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">{t("monitor.nodeVersion")}</p>
                            <p className="text-sm font-medium">{metrics?.process.nodeVersion || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t("monitor.platform")}</p>
                            <p className="text-sm font-medium">{metrics?.process.platform || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t("monitor.env")}</p>
                            <p className="text-sm font-medium">{health?.environment || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t("monitor.lastUpdated")}</p>
                            <p className="text-sm font-medium">
                                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString('zh-TW') : 'N/A'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
