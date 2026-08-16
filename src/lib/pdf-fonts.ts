import { Font } from '@react-pdf/renderer';

let fontsRegistered = false;

export function registerPdfFonts() {
    if (fontsRegistered) return;

    try {
        Font.register({
            family: 'Noto Sans TC',
            fonts: [
                {
                    src: '/fonts/noto-sans-tc-400-optimized.woff2',
                    fontWeight: 400,
                },
                {
                    src: '/fonts/noto-sans-tc-700-optimized.woff2',
                    fontWeight: 700,
                }
            ]
        });

        fontsRegistered = true;
        console.log('PDF fonts registered successfully (optimized subset with full Chinese support)');
    } catch (error) {
        console.error('Error registering PDF fonts:', error);
    }
}
