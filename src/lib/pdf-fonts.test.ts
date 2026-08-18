// @vitest-environment node

/**
 * PDF 字型檔的驗收
 *
 * 這裡守的是兩件已經真實發生過的事：
 *
 * 1. 字型換成 woff2 → 瀏覽器端產生 PDF 直接失敗，使用者只看到
 *    「PDF 生成失敗，請稍後再試」。
 * 2. 字型用了缺全形標點的子集 → 客戶名稱、地址、備註裡的
 *    「：（），！？」會從印出來的單據上無聲消失，沒人會發現。
 *
 * fontkit 是 @react-pdf/renderer 自帶的相依套件；解析不到代表相依關係變了，
 * 那本身就值得看一眼，因此這裡不做 skip。
 */

import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as fontkit from 'fontkit';

vi.mock('@react-pdf/renderer', () => ({ Font: { register: vi.fn() } }));

const FONTS = path.join(process.cwd(), 'public', 'fonts');
const files = ['noto-sans-tc-pdf-400.woff', 'noto-sans-tc-pdf-700.woff'];

/** 單據上真的會出現、而且曾經被吃掉的字元 */
const REQUIRED_TEXT = '：（），。、！？；％／「」－0123456789ABCabc$報價單總計金額統一編號臺北市';

describe('PDF 字型檔', () => {
    it.each(files)('%s 存在且是 woff（woff2 會讓 PDF 產生失敗）', (file) => {
        const buffer = fs.readFileSync(path.join(FONTS, file));
        expect(buffer.subarray(0, 4).toString('latin1')).toBe('wOFF');
    });

    it.each(files)('%s 涵蓋單據上會用到的全形標點與中文', (file) => {
        const font = fontkit.create(fs.readFileSync(path.join(FONTS, file)));
        const missing = [...REQUIRED_TEXT].filter((ch) => !font.hasGlyphForCodePoint(ch.codePointAt(0)!));
        expect(missing.join('')).toBe('');
    });

    it('註冊的字型路徑與實際存在的檔案一致', async () => {
        // 直接看 registerPdfFonts() 實際註冊了什麼，而不是用正規表達式讀原始碼
        // —— 換個引號或換行就誤報的測試沒有意義。
        const { Font } = await import('@react-pdf/renderer');
        const { registerPdfFonts } = await import('./pdf-fonts');
        registerPdfFonts();

        const register = vi.mocked(Font.register);
        expect(register).toHaveBeenCalledTimes(1);

        const registered = (register.mock.calls[0][0] as { fonts: { src: string }[] }).fonts
            .map((f) => f.src.replace('/fonts/', ''));

        expect(registered).toHaveLength(2);
        for (const file of registered) {
            expect(fs.existsSync(path.join(FONTS, file))).toBe(true);
        }
    });
});
