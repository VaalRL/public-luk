import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * 效能監控端點
 * 
 * GET /api/metrics
 * 
 * 返回系統效能指標：
 * - 請求統計
 * - 記憶體使用量
 * - 系統運行時間
 */

// 這些變數應該與 middleware.ts 中的共享，但為了簡化，這裡獨立實作
// 生產環境應使用 Redis 或其他共享儲存
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

export async function GET() {
    try {
        const memoryUsage = process.memoryUsage();

        const metrics: PerformanceMetrics = {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            memory: {
                heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
                heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + 'MB',
                rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + 'MB',
                external: (memoryUsage.external / 1024 / 1024).toFixed(2) + 'MB',
            },
            process: {
                pid: process.pid,
                nodeVersion: process.version,
                platform: process.platform,
            },
        };

        logger.debug({ metrics }, 'Metrics requested');

        return NextResponse.json(metrics, { status: 200 });
    } catch (error) {
        logger.error({ error }, 'Failed to get metrics');

        return NextResponse.json(
            { error: 'Failed to retrieve metrics' },
            { status: 500 }
        );
    }
}
