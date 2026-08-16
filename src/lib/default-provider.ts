/**
 * 預設開立公司（乙方）
 *
 * 帳單如果沒有指定 provider，PDF 上仍需要有一組開立方資訊。
 * 這些值透過環境變數設定，不寫死在程式碼裡 —— 否則任何人取得原始碼
 * 就等於取得該公司的統編與聯絡人個資。
 *
 * 設定方式請見 .env.example 的 NEXT_PUBLIC_DEFAULT_PROVIDER_* 區段。
 * 未設定時所有欄位為空字串，PDF 會顯示 "-"。
 *
 * 注意：這些是 NEXT_PUBLIC_ 變數，會被打包進前端。請勿放入機密資訊；
 * 這裡放的本來就是會印在帳單上、對客戶公開的資訊。
 */

import type { PdfCompany } from "@/types/invoice-pdf";

export const defaultProvider: PdfCompany = {
    name: process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_NAME ?? "",
    taxId: process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_TAX_ID ?? "",
    contactName: process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_CONTACT ?? "",
    email: process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_EMAIL ?? "",
    phone: process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_PHONE ?? "",
    address: process.env.NEXT_PUBLIC_DEFAULT_PROVIDER_ADDRESS ?? "",
    logoPath: null,
    stampPath: null,
};
