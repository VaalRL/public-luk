import { NextResponse } from 'next/server';
import { setCsrfToken } from '@/lib/csrf';

/**
 * CSRF Token 端點
 * 
 * GET /api/csrf-token
 * 
 * 生成並返回 CSRF Token
 * Token 會同時設定到 Cookie 中
 */
export async function GET() {
    try {
        const token = await setCsrfToken();

        return NextResponse.json({
            token,
            message: 'CSRF token generated successfully',
        });
    } catch (error) {
        console.error('Failed to generate CSRF token:', error);

        return NextResponse.json(
            { error: 'Failed to generate CSRF token' },
            { status: 500 }
        );
    }
}
