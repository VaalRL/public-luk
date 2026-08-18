/**
 * fontkit 沒有附型別定義，這裡只宣告字型驗收測試會用到的部分
 * （fontkit 隨 @react-pdf/renderer 一起安裝，僅在測試中使用）。
 */
declare module "fontkit" {
    export interface Font {
        readonly postscriptName: string;
        readonly numGlyphs: number;
        hasGlyphForCodePoint(codePoint: number): boolean;
    }

    /** 解析 ttf/otf/woff；字型集合會回傳多個字型 */
    export function create(buffer: Buffer | Uint8Array): Font;
}
