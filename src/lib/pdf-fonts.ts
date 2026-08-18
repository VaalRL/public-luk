import { Font } from '@react-pdf/renderer';

/**
 * PDF 字型註冊
 *
 * 一定要用 .woff，不要換回 .woff2 ——
 * @react-pdf/renderer 內嵌 woff2 時會在瀏覽器端丟出
 * 「Cannot read properties of undefined (reading 'version')」，
 * 整個報價單產生流程失敗，使用者只會看到「PDF 生成失敗，請稍後再試」。
 * （woff2 需要一個以 data: URI 載入的 brotli WebAssembly 模組，
 * 在本專案的 CSP 下會被擋掉；就算放行，字型仍解析失敗。）
 *
 * 字型檔由 scripts/build-pdf-fonts.py 產生（合併 @fontsource 的多個子集）。
 * 不要改用 @fontsource 單一子集或舊的 *-optimized/*-subset 檔案：
 * 那些子集裡沒有全形標點（：（），！？），客戶名稱、地址裡的標點
 * 會從印出來的單據上無聲消失。
 * 檔案只在產生 PDF 時抓一次，實際嵌進 PDF 的仍只有用到的字。
 */

/**
 * PDF 使用的字型家族名稱。
 * 註冊與使用兩邊必須是同一個字串，所以只定義在這裡一次。
 */
export const PDF_FONT_FAMILY = 'Noto Sans TC';

let fontsRegistered = false;

export function registerPdfFonts() {
    if (fontsRegistered) return;

    try {
        Font.register({
            family: PDF_FONT_FAMILY,
            fonts: [
                {
                    src: '/fonts/noto-sans-tc-pdf-400.woff',
                    fontWeight: 400,
                },
                {
                    src: '/fonts/noto-sans-tc-pdf-700.woff',
                    fontWeight: 700,
                }
            ]
        });

        fontsRegistered = true;
        console.log('PDF fonts registered successfully (Noto Sans TC, full Chinese coverage)');
    } catch (error) {
        console.error('Error registering PDF fonts:', error);
    }
}
