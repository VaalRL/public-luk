/**
 * 匯款帳號歸戶解析
 *
 * 自動對帳時，一個後五碼帳號可能對應到多家公司（共用虛擬帳號）。
 * 這裡把「這個帳號的入帳到底算誰的」抽成純函式，理由有二：
 *
 * 1. 原本的實作直接對 `accountToCompanies` Map 內的 Set 呼叫 `.clear()/.add()`，
 *    竄改了共用的資料結構，導致後續判斷「此帳號是否為共用帳號」時讀到被改過的值，
 *    同一筆入帳會被兩家公司同時認領。
 * 2. 歸戶規則是對帳最關鍵的商業邏輯，抽成純函式才能單獨測試。
 */

export type AccountOwnership =
    /** 已歸戶到單一公司 */
    | { kind: "owned"; companyId: string }
    /** 沒有任何公司登記這個後五碼 */
    | { kind: "unknown" }
    /** 共用帳號，且多家公司都有未結帳款，需人工判斷 */
    | { kind: "ambiguous"; companyIds: string[] }
    /** 共用帳號，但沒有任何一家有未結帳款，本次不處理 */
    | { kind: "idle" };

/**
 * 解析每個入帳帳號應歸屬於哪一家公司。
 *
 * @param last5List            本次有入帳的後五碼清單
 * @param accountToCompanies   後五碼 -> 登記該帳號的公司 ID 集合（唯讀，不會被修改）
 * @param outstandingInvoiceCount  取得某公司未結（unpaid/partial）帳單數量
 */
export function resolveAccountOwners(
    last5List: readonly string[],
    accountToCompanies: ReadonlyMap<string, ReadonlySet<string>>,
    outstandingInvoiceCount: (companyId: string) => number
): Map<string, AccountOwnership> {
    const result = new Map<string, AccountOwnership>();

    for (const last5 of last5List) {
        const companyIds = accountToCompanies.get(last5);

        if (!companyIds || companyIds.size === 0) {
            result.set(last5, { kind: "unknown" });
            continue;
        }

        if (companyIds.size === 1) {
            result.set(last5, { kind: "owned", companyId: [...companyIds][0] });
            continue;
        }

        // 共用帳號：只有實際有未結帳款的公司才是候選
        const withOutstanding = [...companyIds].filter(
            (companyId) => outstandingInvoiceCount(companyId) > 0
        );

        if (withOutstanding.length > 1) {
            result.set(last5, { kind: "ambiguous", companyIds: withOutstanding });
        } else if (withOutstanding.length === 1) {
            result.set(last5, { kind: "owned", companyId: withOutstanding[0] });
        } else {
            result.set(last5, { kind: "idle" });
        }
    }

    return result;
}

/**
 * 取得某公司「確定持有」的帳號後五碼。
 *
 * 只有歸戶結果明確指向該公司的帳號才算數 —— 這正是原本用
 * `accountToCompanies.get(last5).size === 1` 判斷會出錯的地方：
 * 共用帳號被解析給 A 之後，B 也會把它看成「非共用」而一起認領。
 */
export function accountsOwnedBy(
    companyId: string,
    candidateLast5: readonly string[],
    ownership: ReadonlyMap<string, AccountOwnership>
): string[] {
    return candidateLast5.filter((last5) => {
        const owner = ownership.get(last5);
        return owner?.kind === "owned" && owner.companyId === companyId;
    });
}
