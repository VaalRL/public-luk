import { NextResponse } from 'next/server';
import { errorTracker } from '@/lib/error-tracker';

/**
 * 錯誤追蹤端點
 * 
 * GET /api/errors - 獲取最近的錯誤列表
 * GET /api/errors?stats=true - 獲取錯誤統計
 * GET /api/errors?id=xxx - 獲取特定錯誤詳情
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === 'true';
    const errorId = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '10');

    try {
        // 獲取特定錯誤
        if (errorId) {
            const error = errorTracker.getErrorById(errorId);
            if (!error) {
                return NextResponse.json(
                    { error: 'Error not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json(error);
        }

        // 只獲取統計
        if (statsOnly) {
            const stats = errorTracker.getStats();
            return NextResponse.json(stats);
        }

        // 獲取最近的錯誤和統計
        const errors = errorTracker.getRecentErrors(limit);
        const stats = errorTracker.getStats();

        return NextResponse.json({
            errors,
            stats,
        });
    } catch {
        return NextResponse.json(
            { error: 'Failed to retrieve error data' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/errors - 清除所有錯誤記錄
 */
export async function DELETE() {
    try {
        errorTracker.clear();
        return NextResponse.json({ message: 'Error tracker cleared' });
    } catch {
        return NextResponse.json(
            { error: 'Failed to clear error tracker' },
            { status: 500 }
        );
    }
}
