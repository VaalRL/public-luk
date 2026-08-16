"use server";

import fs from "fs/promises";
import path from "path";
import { format } from "date-fns";

/**
 * PDF 備份配置
 */
type DirectoryStructure = "flat" | "date-hierarchy" | "year-month";

const PDF_BACKUP_CONFIG = {
    // 備份根目錄（相對於專案根目錄）
    backupRoot: "backups/pdfs",
    // 是否啟用備份
    enabled: true,
    // 目錄結構格式：'flat' | 'date-hierarchy' | 'year-month'
    structure: "date-hierarchy" as DirectoryStructure,
};

/**
 * 確保目錄存在，如果不存在則創建
 */
async function ensureDirectory(dirPath: string): Promise<void> {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

/**
 * 根據配置生成備份目錄路徑
 */
function getBackupDirectory(date: Date): string {
    const backupRoot = process.env.PDF_BACKUP_DIR || path.join(process.cwd(), PDF_BACKUP_CONFIG.backupRoot);

    switch (PDF_BACKUP_CONFIG.structure) {
        case "date-hierarchy":
            // 格式: backups/pdfs/2025/12/03/
            return path.join(
                backupRoot,
                format(date, "yyyy"),
                format(date, "MM"),
                format(date, "dd")
            );

        case "year-month":
            // 格式: backups/pdfs/2025-12/
            return path.join(backupRoot, format(date, "yyyy-MM"));

        case "flat":
        default:
            // 格式: backups/pdfs/
            return backupRoot;
    }
}

/**
 * 生成備份檔案名稱
 */
function generateBackupFileName(originalFileName: string, date: Date): string {
    const timestamp = format(date, "HHmmss");
    const ext = path.extname(originalFileName);
    const name = path.basename(originalFileName, ext);

    // 格式: invoice-ABC123_20251203_143052.pdf
    return `${name}_${format(date, "yyyyMMdd")}_${timestamp}${ext}`;
}

/**
 * 儲存 PDF 到本地備份目錄
 */
export async function savePdfBackup(
    pdfBuffer: ArrayBuffer,
    fileName: string,
    invoiceData?: {
        invoiceNumber?: string;
        companyName?: string;
        amount?: number;
    }
): Promise<{ success: boolean; path?: string; error?: string }> {
    if (!PDF_BACKUP_CONFIG.enabled) {
        return { success: true, path: "Backup disabled" };
    }

    try {
        const now = new Date();

        // 獲取備份目錄
        const backupDir = getBackupDirectory(now);

        // 確保目錄存在
        await ensureDirectory(backupDir);

        // 生成備份檔案名稱
        const backupFileName = generateBackupFileName(fileName, now);
        const backupFilePath = path.join(backupDir, backupFileName);

        // 寫入 PDF 檔案
        const buffer = Buffer.from(pdfBuffer);
        await fs.writeFile(backupFilePath, buffer);

        // 可選：寫入 metadata JSON
        if (invoiceData) {
            const metadataPath = backupFilePath.replace(".pdf", ".json");
            const metadata = {
                fileName: backupFileName,
                originalFileName: fileName,
                timestamp: now.toISOString(),
                invoiceNumber: invoiceData.invoiceNumber,
                companyName: invoiceData.companyName,
                amount: invoiceData.amount,
                fileSize: buffer.length,
            };
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        }

        // 返回相對路徑
        const relativePath = path.relative(process.cwd(), backupFilePath);

        console.log(`✅ PDF 已備份: ${relativePath}`);

        return {
            success: true,
            path: relativePath,
        };
    } catch (error) {
        console.error("❌ PDF 備份失敗:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * 獲取指定日期的所有備份檔案
 */
export async function getBackupsByDate(
    date: Date
): Promise<{ success: boolean; files?: string[]; error?: string }> {
    try {
        const backupDir = getBackupDirectory(date);

        // 檢查目錄是否存在
        try {
            await fs.access(backupDir);
        } catch {
            return { success: true, files: [] };
        }

        // 讀取目錄內容
        const files = await fs.readdir(backupDir);

        // 只返回 PDF 檔案
        const pdfFiles = files
            .filter((file) => file.endsWith(".pdf"))
            .map((file) => path.join(backupDir, file));

        return {
            success: true,
            files: pdfFiles,
        };
    } catch (error) {
        console.error("讀取備份檔案失敗:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * 清理舊的備份檔案（保留最近 N 天）
 */
export async function cleanupOldBackups(
    daysToKeep: number = 90
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
        const backupRoot = process.env.PDF_BACKUP_DIR || path.join(process.cwd(), PDF_BACKUP_CONFIG.backupRoot);

        // 計算截止日期
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        let deletedCount = 0;

        // 遞迴掃描備份目錄
        async function scanDirectory(dirPath: string) {
            try {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);

                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath);

                        // 刪除空目錄
                        const remainingFiles = await fs.readdir(fullPath);
                        if (remainingFiles.length === 0) {
                            await fs.rmdir(fullPath);
                        }
                    } else if (entry.isFile()) {
                        const stats = await fs.stat(fullPath);

                        if (stats.mtime < cutoffDate) {
                            await fs.unlink(fullPath);
                            deletedCount++;
                            console.log(`🗑️  已刪除舊備份: ${path.relative(process.cwd(), fullPath)}`);
                        }
                    }
                }
            } catch (error) {
                console.error(`掃描目錄失敗: ${dirPath}`, error);
            }
        }

        await scanDirectory(backupRoot);

        console.log(`✅ 清理完成，共刪除 ${deletedCount} 個舊備份檔案`);

        return {
            success: true,
            deletedCount,
        };
    } catch (error) {
        console.error("清理舊備份失敗:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * 獲取備份統計資訊
 */
export async function getBackupStats(): Promise<{
    success: boolean;
    stats?: {
        totalFiles: number;
        totalSize: number;
        oldestBackup?: Date;
        newestBackup?: Date;
    };
    error?: string;
}> {
    try {
        const backupRoot = process.env.PDF_BACKUP_DIR || path.join(process.cwd(), PDF_BACKUP_CONFIG.backupRoot);

        let totalFiles = 0;
        let totalSize = 0;
        let oldestBackup: Date | undefined;
        let newestBackup: Date | undefined;

        async function scanDirectory(dirPath: string) {
            try {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);

                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else if (entry.isFile() && entry.name.endsWith(".pdf")) {
                        const stats = await fs.stat(fullPath);
                        totalFiles++;
                        totalSize += stats.size;

                        if (!oldestBackup || stats.mtime < oldestBackup) {
                            oldestBackup = stats.mtime;
                        }
                        if (!newestBackup || stats.mtime > newestBackup) {
                            newestBackup = stats.mtime;
                        }
                    }
                }
            } catch {
                // 目錄不存在或無法讀取
            }
        }

        await scanDirectory(backupRoot);

        return {
            success: true,
            stats: {
                totalFiles,
                totalSize,
                oldestBackup,
                newestBackup,
            },
        };
    } catch (error) {
        console.error("獲取備份統計失敗:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
