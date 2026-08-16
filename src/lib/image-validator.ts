/**
 * 圖片驗證和優化工具
 * 確保 Logo 和印章圖片不會過大，影響 PDF 生成效能
 */

export interface ImageValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    originalSize?: number;
    recommendedMaxSize: number;
}

export interface ImageOptimizationOptions {
    maxSizeKB?: number;  // 最大檔案大小（KB）
    maxWidth?: number;   // 最大寬度（px）
    maxHeight?: number;  // 最大高度（px）
    quality?: number;    // 壓縮品質（0-1）
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
    maxSizeKB: 500,     // 500KB
    maxWidth: 800,      // 800px
    maxHeight: 800,     // 800px
    quality: 0.85,      // 85% 品質
};

/**
 * 驗證圖片檔案
 */
export function validateImage(
    file: File,
    options: ImageOptimizationOptions = {}
): ImageValidationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];

    // 檢查檔案類型
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        errors.push(`不支援的圖片格式：${file.type}。請使用 JPG、PNG 或 WebP。`);
    }

    // 檢查檔案大小
    const fileSizeKB = file.size / 1024;
    if (fileSizeKB > opts.maxSizeKB) {
        errors.push(`圖片檔案過大：${fileSizeKB.toFixed(1)} KB。建議不超過 ${opts.maxSizeKB} KB。`);
    } else if (fileSizeKB > opts.maxSizeKB * 0.8) {
        warnings.push(`圖片檔案較大：${fileSizeKB.toFixed(1)} KB。建議壓縮以提升 PDF 生成速度。`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        originalSize: file.size,
        recommendedMaxSize: opts.maxSizeKB * 1024,
    };
}

/**
 * 優化圖片（調整大小和壓縮）
 */
export async function optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {}
): Promise<Blob> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                // 計算新尺寸（保持長寬比）
                let { width, height } = img;
                const aspectRatio = width / height;

                if (width > opts.maxWidth || height > opts.maxHeight) {
                    if (width > height) {
                        width = opts.maxWidth;
                        height = width / aspectRatio;
                    } else {
                        height = opts.maxHeight;
                        width = height * aspectRatio;
                    }
                }

                // 創建 canvas 並繪製調整後的圖片
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('無法創建 canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // 將 canvas 轉換為 Blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('圖片優化失敗'));
                        }
                    },
                    'image/jpeg',
                    opts.quality
                );
            };

            img.onerror = () => {
                reject(new Error('圖片載入失敗'));
            };

            img.src = e.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error('檔案讀取失敗'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * 檢查圖片尺寸
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height,
                });
            };

            img.onerror = () => {
                reject(new Error('圖片載入失敗'));
            };

            img.src = e.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error('檔案讀取失敗'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * 驗證並優化圖片（組合函數）
 */
export async function validateAndOptimizeImage(
    file: File,
    options: ImageOptimizationOptions = {}
): Promise<{ blob: Blob; validation: ImageValidationResult; optimized: boolean }> {
    // 先驗證
    const validation = validateImage(file, options);

    // 如果有錯誤，不進行優化
    if (!validation.isValid) {
        throw new Error(`圖片驗證失敗：${validation.errors.join(', ')}`);
    }

    // 如果圖片過大或有警告，進行優化
    const shouldOptimize = validation.warnings.length > 0 || file.size > (options.maxSizeKB || DEFAULT_OPTIONS.maxSizeKB) * 1024 * 0.8;

    if (shouldOptimize) {
        const optimizedBlob = await optimizeImage(file, options);
        return {
            blob: optimizedBlob,
            validation,
            optimized: true,
        };
    }

    // 否則返回原始檔案
    return {
        blob: file,
        validation,
        optimized: false,
    };
}
