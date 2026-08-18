import { describe, it, expect } from 'vitest';
import { LOCALES, type Locale } from './config';
import { messagesByLocale, translate, type Messages } from './messages';

/** 把巢狀文案攤平成 "a.b.c" 的鍵列表 */
function leafKeys(node: unknown, prefix = ''): string[] {
    if (typeof node === 'string') return [prefix];
    if (typeof node !== 'object' || node === null) return [];
    return Object.entries(node).flatMap(([k, v]) =>
        leafKeys(v, prefix ? `${prefix}.${k}` : k)
    );
}

describe('文案字典', () => {
    // 型別上已經擋住缺鍵，但型別可以被 as 繞過；這裡再從執行時確認一次
    it('每個語言的鍵完全一致', () => {
        const [base, ...others] = LOCALES;
        const baseKeys = leafKeys(messagesByLocale[base]).sort();

        for (const locale of others) {
            expect(leafKeys(messagesByLocale[locale]).sort(), `${locale} 的鍵與 ${base} 不一致`)
                .toEqual(baseKeys);
        }
    });

    it('沒有任何一則文案是空字串', () => {
        for (const locale of LOCALES) {
            const empty = leafKeys(messagesByLocale[locale]).filter(
                (key) => translate(messagesByLocale[locale], key) === ''
            );
            expect(empty, `${locale} 有空白文案`).toEqual([]);
        }
    });

    // 英文版忘了翻，直接複製中文過去的話，這裡會抓到
    it('英文版不含中文字', () => {
        const chinese = /[一-鿿]/;
        const keys = leafKeys(messagesByLocale.en);
        const withChinese = keys.filter((key) => chinese.test(translate(messagesByLocale.en, key)));
        expect(withChinese).toEqual([]);
    });

    describe('translate', () => {
        const messages = messagesByLocale['zh-TW'];

        it('依點分路徑取出文案', () => {
            expect(translate(messages, 'nav.dashboard')).toBe('概覽');
        });

        it('代入變數', () => {
            expect(translate({ a: { b: '共 {n} 筆' } } as unknown as Messages, 'a.b', { n: 3 }))
                .toBe('共 3 筆');
        });

        it('沒給到的變數保持原樣，不會變成 undefined', () => {
            expect(translate({ a: '{x} / {y}' } as unknown as Messages, 'a', { x: 1 }))
                .toBe('1 / {y}');
        });

        // 查不到時回傳鍵名，畫面上會看到 "nav.nope" 這種字串，一眼知道是漏翻
        it('查不到的鍵回傳鍵名本身', () => {
            expect(translate(messages, 'nav.nope')).toBe('nav.nope');
            expect(translate(messages, 'nav')).toBe('nav');
            expect(translate(messages, '')).toBe('');
        });
    });

    it('每個語言都有對應的文案', () => {
        for (const locale of LOCALES as readonly Locale[]) {
            expect(messagesByLocale[locale]).toBeTruthy();
        }
    });
});
