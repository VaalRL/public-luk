/**
 * Fuzzy Matching Utilities
 * 用於處理帳號識別和字串相似度比較
 */

/**
 * 計算兩個字串的 Levenshtein Distance (編輯距離)
 * @param a 字串 A
 * @param b 字串 B
 * @returns 編輯距離 (整數)
 */
export function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * 計算兩個字串的相似度 (0-1)
 * @param a 字串 A
 * @param b 字串 B
 * @returns 相似度 (0.0 - 1.0)
 */
export function calculateSimilarity(a: string, b: string): number {
    const maxLength = Math.max(a.length, b.length);
    if (maxLength === 0) return 1.0;

    const distance = levenshteinDistance(a, b);
    return 1.0 - (distance / maxLength);
}

/**
 * 正規化帳號字串
 * 移除所有非數字字符
 * @param input 原始字串
 * @returns 純數字字串
 */
export function normalizeAccount(input: string): string {
    if (!input) return '';
    return input.replace(/\D/g, '');
}

/**
 * 從文字中提取可能的帳號後5碼
 * @param text 包含帳號的文字
 * @returns 提取出的後5碼，如果找不到則返回 null
 */
export function extractLast5Digits(text: string): string | null {
    if (!text) return null;

    // 1. 先嘗試正規化（移除空格、破折號等）
    const normalized = normalizeAccount(text);

    // 2. 如果正規化後長度 >= 5，取最後 5 碼
    if (normalized.length >= 5) {
        return normalized.slice(-5);
    }

    // 3. 如果正規化後長度不足，嘗試從原始文字中尋找連續的5位數字
    const match = text.match(/\d{5}/);
    if (match) {
        return match[0];
    }

    return null;
}

/**
 * 在一組候選帳號中尋找最佳匹配
 * @param target 目標帳號 (如交易備註中的帳號)
 * @param candidates 候選帳號列表 (已知的所有公司帳號)
 * @param threshold 相似度閾值 (預設 0.8)
 * @returns 最佳匹配結果
 */
export function findBestAccountMatch(
    target: string,
    candidates: string[],
    threshold: number = 0.8
): { match: string | null; score: number; method: 'exact' | 'fuzzy' | 'none' } {
    const normalizedTarget = normalizeAccount(target);

    // 1. 精確匹配
    if (candidates.includes(normalizedTarget)) {
        return { match: normalizedTarget, score: 1.0, method: 'exact' };
    }

    // 2. 模糊匹配
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
        // 嘗試多種比較方式

        // A. 直接比較正規化後的字串
        const score1 = calculateSimilarity(normalizedTarget, candidate);

        // B. 如果目標字串較長，嘗試滑動窗口匹配
        let score2 = 0;
        if (normalizedTarget.length > candidate.length) {
            for (let i = 0; i <= normalizedTarget.length - candidate.length; i++) {
                const sub = normalizedTarget.substring(i, i + candidate.length);
                const subScore = calculateSimilarity(sub, candidate);
                if (subScore > score2) score2 = subScore;
            }
        }

        const score = Math.max(score1, score2);

        if (score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
        }
    }

    if (bestScore >= threshold) {
        return { match: bestMatch, score: bestScore, method: 'fuzzy' };
    }

    return { match: null, score: bestScore, method: 'none' };
}
