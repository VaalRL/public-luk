import { describe, it, expect } from 'vitest';
import { resolveAccountOwners, accountsOwnedBy } from './account-resolution';

const counts = (map: Record<string, number>) => (companyId: string) => map[companyId] ?? 0;

describe('account-resolution', () => {
    describe('resolveAccountOwners', () => {
        it('歸戶到唯一登記該帳號的公司', () => {
            const owners = resolveAccountOwners(
                ['11111'],
                new Map([['11111', new Set(['A'])]]),
                counts({ A: 1 })
            );
            expect(owners.get('11111')).toEqual({ kind: 'owned', companyId: 'A' });
        });

        it('沒有公司登記的帳號標為 unknown', () => {
            const owners = resolveAccountOwners(['99999'], new Map(), counts({}));
            expect(owners.get('99999')).toEqual({ kind: 'unknown' });
        });

        it('共用帳號只有一家有未結帳款時歸戶給該公司', () => {
            const owners = resolveAccountOwners(
                ['11111'],
                new Map([['11111', new Set(['A', 'B'])]]),
                counts({ A: 2, B: 0 })
            );
            expect(owners.get('11111')).toEqual({ kind: 'owned', companyId: 'A' });
        });

        it('共用帳號有多家都有未結帳款時標為 ambiguous', () => {
            const owners = resolveAccountOwners(
                ['11111'],
                new Map([['11111', new Set(['A', 'B'])]]),
                counts({ A: 1, B: 3 })
            );
            const owner = owners.get('11111');
            expect(owner?.kind).toBe('ambiguous');
            expect(owner?.kind === 'ambiguous' && owner.companyIds.sort()).toEqual(['A', 'B']);
        });

        it('共用帳號沒有任何一家有未結帳款時標為 idle', () => {
            const owners = resolveAccountOwners(
                ['11111'],
                new Map([['11111', new Set(['A', 'B'])]]),
                counts({ A: 0, B: 0 })
            );
            expect(owners.get('11111')).toEqual({ kind: 'idle' });
        });

        // 這是造成「同一筆入帳被兩家公司認領」的根因：
        // 舊實作用 companyIds.clear() / .add() 直接改寫了 Map 裡的 Set
        it('不得修改傳入的 accountToCompanies', () => {
            const shared = new Set(['A', 'B']);
            const accountToCompanies = new Map([['11111', shared]]);

            resolveAccountOwners(['11111'], accountToCompanies, counts({ A: 1, B: 0 }));

            expect([...shared].sort()).toEqual(['A', 'B']);
            expect([...accountToCompanies.get('11111')!].sort()).toEqual(['A', 'B']);
        });
    });

    describe('accountsOwnedBy', () => {
        it('只回傳歸戶結果確實指向該公司的帳號', () => {
            const ownership = resolveAccountOwners(
                ['11111', '22222'],
                new Map([
                    ['11111', new Set(['A', 'B'])], // 共用，只有 A 有未結帳款 -> 歸 A
                    ['22222', new Set(['B'])],      // B 專用
                ]),
                counts({ A: 1, B: 0 })
            );

            expect(accountsOwnedBy('A', ['11111'], ownership)).toEqual(['11111']);
            // 回歸重點：B 也登記了 11111，但它已歸戶給 A，B 不得再認領
            expect(accountsOwnedBy('B', ['11111', '22222'], ownership)).toEqual(['22222']);
        });

        it('ambiguous 的帳號不歸屬任何公司', () => {
            const ownership = resolveAccountOwners(
                ['11111'],
                new Map([['11111', new Set(['A', 'B'])]]),
                counts({ A: 1, B: 1 })
            );

            expect(accountsOwnedBy('A', ['11111'], ownership)).toEqual([]);
            expect(accountsOwnedBy('B', ['11111'], ownership)).toEqual([]);
        });
    });
});
