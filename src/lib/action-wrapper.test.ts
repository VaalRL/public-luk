import { describe, it, expect, vi } from 'vitest';
import { withErrorHandling, withValidation } from './action-wrapper';
import { z } from 'zod';

// Mock logger to avoid actual logging during tests.
// 必須涵蓋 Logger 介面的所有方法：error-tracker 會用到 warn / fatal，
// 少了它們會在錯誤路徑上炸成 "logger.warn is not a function"。
vi.mock('./logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        fatal: vi.fn(),
    },
    logActionStart: vi.fn(),
    logActionSuccess: vi.fn(),
    logActionError: vi.fn(),
    logSecurityEvent: vi.fn(),
    logDatabaseQuery: vi.fn(),
    logPerformanceMetric: vi.fn(),
}));

// Mock rate-limit
vi.mock('./rate-limit', () => ({
    checkRateLimit: vi.fn(() => true),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
    headers: vi.fn(async () => ({
        get: vi.fn(() => '127.0.0.1'),
    })),
}));

describe('action-wrapper', () => {
    describe('withErrorHandling', () => {
        it('should return success result when action succeeds', async () => {
            const mockAction = vi.fn(async () => ({ id: '123', name: 'Test' }));

            const result = await withErrorHandling(mockAction, 'testAction');

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual({ id: '123', name: 'Test' });
            }
            expect(mockAction).toHaveBeenCalledTimes(1);
        });

        it('should return error result when action throws', async () => {
            const mockAction = vi.fn(async () => {
                throw new Error('Test error');
            });

            const result = await withErrorHandling(mockAction, 'testAction');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('Test error');
            }
        });

        it('should handle non-Error throws', async () => {
            const mockAction = vi.fn(async () => {
                throw 'String error';
            });

            const result = await withErrorHandling(mockAction, 'testAction');

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('操作失敗，請稍後再試');
            }
        });
    });

    describe('withValidation', () => {
        const testSchema = z.object({
            name: z.string().min(1),
            age: z.number().min(0),
        });

        it('should validate and execute action with valid data', async () => {
            const mockAction = vi.fn(async (data) => ({ ...data, id: '123' }));
            const validData = { name: 'John', age: 30 };

            const result = await withValidation(
                mockAction,
                'testAction',
                testSchema,
                validData
            );

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual({ name: 'John', age: 30, id: '123' });
            }
            expect(mockAction).toHaveBeenCalledWith(validData);
        });

        it('should return error for invalid data', async () => {
            const mockAction = vi.fn(async (data) => data);
            const invalidData = { name: '', age: -1 };

            const result = await withValidation(
                mockAction,
                'testAction',
                testSchema,
                invalidData
            );

            expect(result.success).toBe(false);
            expect(mockAction).not.toHaveBeenCalled();
        });

        // 以前 zod 的 error.message 被原封不動丟回前端，使用者會在 toast 裡
        // 看到 [{"code":"too_small","path":["name"],...}] 這種 JSON
        it('把驗證錯誤整理成「欄位: 訊息」，不外流 JSON', async () => {
            const mockAction = vi.fn(async (data) => data);

            const result = await withValidation(
                mockAction,
                'testAction',
                z.object({ name: z.string().min(1, 'validation.companyNameRequired') }),
                { name: '' }
            );

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBe('name: 公司名稱不可為空');
                expect(result.error).not.toContain('{');
            }
        });

        it('多個欄位出錯時全部列出', async () => {
            const mockAction = vi.fn(async (data) => data);

            const result = await withValidation(
                mockAction,
                'testAction',
                z.object({
                    name: z.string().min(1, 'validation.companyNameRequired'),
                    email: z.string().email('validation.invalidEmail'),
                }),
                { name: '', email: 'not-an-email' }
            );

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('name: 公司名稱不可為空');
                expect(result.error).toContain('email: 無效的電子郵件格式');
            }
        });

        it('should handle missing required fields', async () => {
            const mockAction = vi.fn(async (data) => data);
            const invalidData = { name: 'John' }; // missing age

            const result = await withValidation(
                mockAction,
                'testAction',
                testSchema,
                invalidData
            );

            expect(result.success).toBe(false);
            expect(mockAction).not.toHaveBeenCalled();
        });
    });
});
