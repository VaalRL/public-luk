import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from './lib/rate-limit';
import { logger } from './lib/logger';
import { logSecurityEvent, securityAudit } from './lib/security-audit';

// 效能監控設定
const SLOW_REQUEST_THRESHOLD = 1000; // 1 秒
const VERY_SLOW_REQUEST_THRESHOLD = 3000; // 3 秒

// 效能統計 (簡單的記憶體儲存，生產環境應使用 Redis 或其他持久化方案)
let requestCount = 0;
let errorCount = 0;
let totalResponseTime = 0;

export async function middleware(request: NextRequest) {
    const startTime = Date.now();
    const { pathname } = request.nextUrl;
    const method = request.method;

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1';

    // 增加請求計數
    requestCount++;

    // 檢查 IP 是否可疑
    const isSuspicious = securityAudit.isSuspiciousIp(ip);
    if (isSuspicious) {
        logger.warn({ ip, pathname, method }, 'Suspicious IP detected');
        logSecurityEvent('unauthorized_access_attempt', 'high', {
            ip,
            pathname,
            method,
            reason: 'Multiple security violations'
        });
    }

    // 1. Rate Limiting
    const isApi = pathname.startsWith('/api');
    const limit = isApi ? 60 : 100;
    const isAllowed = checkRateLimit(ip, limit, 60000);

    if (!isAllowed) {
        errorCount++;
        logger.warn({ ip, pathname, method }, 'Rate limit exceeded');

        // 記錄安全事件
        logSecurityEvent('rate_limit_exceeded', 'medium', {
            ip,
            pathname,
            method,
            action: 'rate_limit'
        });

        if (isApi) {
            return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
        }
        return new NextResponse('Too Many Requests', { status: 429 });
    }

    // 1.5 CSRF：對會改變狀態的 /api 請求做同源檢查
    //
    // 之前 lib/csrf.ts 的雙重提交 Cookie 模式結構上就不可能運作
    // （Cookie 設了 httpOnly，前端永遠讀不到，也沒有任何呼叫端），
    // 註解宣稱「在 middleware 層實作」但這裡其實沒有任何檢查。
    // Server Actions 由 Next.js 內建的 Origin 驗證保護，Route Handlers 則沒有，
    // 所以在這裡補上。
    const isStateChanging = !["GET", "HEAD", "OPTIONS"].includes(method);
    if (isApi && isStateChanging) {
        const origin = request.headers.get("origin");
        const host = request.headers.get("host");

        // 同源請求會帶 origin；沒有 origin 的多半是 curl 之類的非瀏覽器客戶端
        if (origin) {
            let originHost: string | null = null;
            try {
                originHost = new URL(origin).host;
            } catch {
                originHost = null;
            }

            if (!originHost || originHost !== host) {
                logger.warn({ ip, pathname, method, origin, host }, 'Cross-origin write blocked');
                logSecurityEvent('csrf_validation_failed', 'high', { ip, pathname, method, origin, host });
                return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
            }
        }
    }

    // 2. Security Headers
    const response = NextResponse.next();
    const headers = response.headers;

    const csp = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval';
        style-src 'self' 'unsafe-inline';
        img-src 'self' blob: data:;
        font-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        block-all-mixed-content;
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    headers.set('Content-Security-Policy', csp);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // 3. Performance Monitoring
    const duration = Date.now() - startTime;
    totalResponseTime += duration;

    const performanceData = {
        method,
        pathname,
        duration,
        ip,
        timestamp: new Date().toISOString(),
    };

    // 記錄慢請求
    if (duration > VERY_SLOW_REQUEST_THRESHOLD) {
        logger.warn(performanceData, 'Very slow request detected');
    } else if (duration > SLOW_REQUEST_THRESHOLD) {
        logger.warn(performanceData, 'Slow request detected');
    }

    // 添加效能標頭
    headers.set('X-Response-Time', `${duration}ms`);

    // 每 100 個請求記錄一次統計
    // 每 100 個請求記錄一次統計
    if (requestCount % 100 === 0) {
        logger.info({
            requestCount,
            errorCount,
            errorRate: ((errorCount / requestCount) * 100).toFixed(2) + '%',
            avgResponseTime: (totalResponseTime / requestCount).toFixed(2) + 'ms',
        }, 'Performance statistics');
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
