import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * 健康檢查端點
 * 
 * GET /api/health
 * 
 * 檢查項目：
 * - API 可用性
 * - 資料庫連線
 * - 系統時間
 */
export async function GET() {
    const startTime = Date.now();

    try {
        // 檢查資料庫連線
        await prisma.$queryRaw`SELECT 1`;

        const duration = Date.now() - startTime;

        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks: {
                database: {
                    status: 'connected',
                    responseTime: duration,
                },
                api: {
                    status: 'operational',
                },
            },
            environment: process.env.NODE_ENV,
        };

        logger.debug({ healthStatus }, 'Health check passed');

        return NextResponse.json(healthStatus, { status: 200 });
    } catch (error) {
        const duration = Date.now() - startTime;

        const healthStatus = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks: {
                database: {
                    status: 'disconnected',
                    responseTime: duration,
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
                api: {
                    status: 'operational',
                },
            },
            environment: process.env.NODE_ENV,
        };

        logger.error({ healthStatus, error }, 'Health check failed');

        return NextResponse.json(healthStatus, { status: 503 });
    }
}
