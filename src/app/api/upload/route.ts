import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, resolve, sep } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { validateImage } from "@/lib/image-validator";
import { logSecurityEvent } from "@/lib/logger";

/**
 * 公司 Logo / 印章上傳
 *
 * 這個端點會把檔案寫進 public/ 底下（會被靜態 serve），因此檔名與副檔名
 * 一律不採用使用者輸入：
 * - companyId / type 只用於組檔名，且必須通過白名單或格式檢查
 * - 副檔名由通過驗證的 MIME 決定，不是由上傳的檔名決定
 * - 寫入前再確認解析後的路徑仍位於上傳目錄內
 */

const ALLOWED_TYPES = ["logo", "stamp"] as const;

// 只接受這些 MIME，並由它決定副檔名
const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

// 檔案開頭的魔術位元組，避免副檔名與實際內容不符
const SIGNATURES: { ext: string; bytes: number[]; offset?: number }[] = [
    { ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
    { ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    { ext: "webp", bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
];

function matchesSignature(buffer: Buffer, ext: string): boolean {
    const sig = SIGNATURES.find((s) => s.ext === ext);
    if (!sig) return false;
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) return false;
    return sig.bytes.every((b, i) => buffer[offset + i] === b);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const type = String(formData.get("type") ?? "");
        const companyId = String(formData.get("companyId") ?? "");

        if (!file || typeof file === "string") {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
            return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
        }

        // companyId 只允許 UUID —— 這是原本可以用 "../../.." 跳出上傳目錄的地方。
        // 新增公司時公司尚未建立，前端不會帶 companyId，此時用 "new" 當前綴。
        if (companyId && !UUID_RE.test(companyId)) {
            logSecurityEvent("invalid_upload_target", "medium", { companyId, type });
            return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
        }
        const namePrefix = companyId || "new";

        // 沿用既有的圖片驗證（格式與大小），不要另外實作一份
        const validation = validateImage(file);
        if (!validation.isValid) {
            return NextResponse.json(
                { error: validation.errors.join(", ") },
                { status: 400 }
            );
        }

        const ext = MIME_TO_EXT[file.type];
        if (!ext) {
            return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        if (!matchesSignature(buffer, ext)) {
            logSecurityEvent("upload_content_mismatch", "high", { companyId, type, mime: file.type });
            return NextResponse.json(
                { error: "檔案內容與宣告的圖片格式不符" },
                { status: 400 }
            );
        }

        const uploadsDir = join(process.cwd(), "public", "uploads", "companies");
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // 檔名完全由我們產生，不含任何使用者輸入的自由字串
        const filename = `${namePrefix}-${type}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
        const filepath = join(uploadsDir, filename);

        // 收尾防線：確認最終路徑真的還在上傳目錄底下
        const resolvedDir = resolve(uploadsDir);
        const resolvedPath = resolve(filepath);
        if (resolvedPath !== resolvedDir && !resolvedPath.startsWith(resolvedDir + sep)) {
            logSecurityEvent("path_traversal_attempt", "high", { companyId, type });
            return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
        }

        await writeFile(resolvedPath, buffer);

        return NextResponse.json({
            success: true,
            path: `/uploads/companies/${filename}`,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
