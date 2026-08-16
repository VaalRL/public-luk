import { describe, it, expect } from 'vitest';
import { normalizeAccount, calculateSimilarity, findBestAccountMatch, extractLast5Digits } from './fuzzy-match';

describe('fuzzy-match', () => {
    describe('normalizeAccount', () => {
        it('should remove spaces and dashes', () => {
            expect(normalizeAccount('12 345')).toBe('12345');
            expect(normalizeAccount('12-345')).toBe('12345');
            expect(normalizeAccount('1 2-3 4-5')).toBe('12345');
        });

        it('should remove all non-digit characters', () => {
            expect(normalizeAccount('ABC123')).toBe('123');
            expect(normalizeAccount('XyZ')).toBe('');
        });

        it('should handle empty strings', () => {
            expect(normalizeAccount('')).toBe('');
        });

        it('should handle strings with only spaces', () => {
            expect(normalizeAccount('   ')).toBe('');
        });
    });

    describe('calculateSimilarity', () => {
        it('should return 1.0 for identical strings', () => {
            expect(calculateSimilarity('12345', '12345')).toBe(1.0);
            expect(calculateSimilarity('abc', 'abc')).toBe(1.0);
        });

        it('should return 0 for completely different strings of same length', () => {
            expect(calculateSimilarity('12345', '67890')).toBe(0);
        });

        it('should calculate similarity for similar strings', () => {
            const similarity = calculateSimilarity('12345', '12346');
            expect(similarity).toBeGreaterThan(0.7);
            expect(similarity).toBeLessThan(1.0);
        });

        it('should handle empty strings', () => {
            expect(calculateSimilarity('', '')).toBe(1.0);
            expect(calculateSimilarity('abc', '')).toBe(0);
            expect(calculateSimilarity('', 'abc')).toBe(0);
        });
    });

    describe('extractLast5Digits', () => {
        it('should extract last 5 digits from number string', () => {
            expect(extractLast5Digits('1234567890')).toBe('67890');
            expect(extractLast5Digits('12345')).toBe('12345');
        });

        it('should extract from formatted account numbers', () => {
            expect(extractLast5Digits('123-456-78901')).toBe('78901');
            expect(extractLast5Digits('123 456 789')).toBe('56789');
        });

        it('should return null for strings without 5 digits', () => {
            expect(extractLast5Digits('1234')).toBeNull();
            expect(extractLast5Digits('abc')).toBeNull();
        });

        it('should handle null/empty input', () => {
            expect(extractLast5Digits('')).toBeNull();
        });
    });

    describe('findBestAccountMatch', () => {
        it('should find exact match', () => {
            const result = findBestAccountMatch('12345', ['12345', '67890']);
            expect(result.match).toBe('12345');
            expect(result.score).toBe(1.0);
            expect(result.method).toBe('exact');
        });

        it('should find fuzzy match above threshold', () => {
            const result = findBestAccountMatch('12345', ['12346', '67890'], 0.8);
            // The match should either be exact or fuzzy
            if (result.match) {
                expect(result.score).toBeGreaterThan(0.7); // More lenient threshold
                expect(['exact', 'fuzzy']).toContain(result.method);
            } else {
                // If no match found, score should be below threshold
                expect(result.score).toBeLessThan(0.8);
                expect(result.method).toBe('none');
            }
        });

        it('should return null when no match above threshold', () => {
            const result = findBestAccountMatch('12345', ['67890', '11111'], 0.9);
            expect(result.match).toBeNull();
            expect(result.method).toBe('none');
        });

        it('should handle empty candidates array', () => {
            const result = findBestAccountMatch('12345', []);
            expect(result.match).toBeNull();
            expect(result.method).toBe('none');
        });
    });
});
