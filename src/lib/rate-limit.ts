/**
 * Simple in-memory rate limiter
 * Note: This works for single-instance deployments. For multi-instance/serverless,
 * use Redis or a database-backed solution.
 */

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// Clean up old entries periodically (every 10 minutes)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of rateLimitMap.entries()) {
            if (now - value.lastReset > 600000) { // 10 minutes
                rateLimitMap.delete(key);
            }
        }
    }, 600000);
}

/**
 * Check if an identifier has exceeded the rate limit
 * @param identifier Unique identifier (e.g., IP address or User ID)
 * @param limit Max requests per window
 * @param windowMs Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(identifier: string, limit: number = 60, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(identifier);

    if (!record) {
        rateLimitMap.set(identifier, { count: 1, lastReset: now });
        return true;
    }

    // Reset if window has passed
    if (now - record.lastReset > windowMs) {
        record.count = 1;
        record.lastReset = now;
        return true;
    }

    // Check limit
    if (record.count >= limit) {
        return false;
    }

    // Increment
    record.count++;
    return true;
}
