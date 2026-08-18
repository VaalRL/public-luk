# 字型檔案

本目錄的 `noto-sans-tc-*` 字型來自 **Noto Sans TC**（Google 開發），
以 **SIL Open Font License 1.1** 授權釋出。

- 完整授權條款：[`LICENSE-Noto-Sans-TC.txt`](./LICENSE-Noto-Sans-TC.txt)
- 上游套件：[`@fontsource/noto-sans-tc`](https://www.npmjs.com/package/@fontsource/noto-sans-tc)

## 檔案用途

| 檔案 | 用途 |
| --- | --- |
| `noto-sans-tc-pdf-400.woff`、`noto-sans-tc-pdf-700.woff` | 報價單 PDF 實際使用的字型 |
| `noto-sans-tc-chinese-traditional-{400,700}-normal.woff` | 上面兩個檔案的合併基底，僅供重新產生時使用 |

`*-pdf-*.woff` 由 [`scripts/build-pdf-fonts.py`](../../scripts/build-pdf-fonts.py)
產生：把 `@fontsource` 的常用漢字子集，與補齊**全形標點**（：（），！？；％／）
的其他子集合併成單一檔案。

之所以要合併：`chinese-traditional` 子集本身沒有全形標點，
直接拿來用的話，客戶名稱、地址、備註裡的標點會從印出來的單據上無聲消失。

之所以是 `.woff` 而非 `.woff2`：`@react-pdf/renderer` 內嵌 woff2 會在
瀏覽器端失敗，使用者只會看到「PDF 生成失敗」。細節見
[`src/lib/pdf-fonts.ts`](../../src/lib/pdf-fonts.ts)。

依 OFL 條款，衍生的字型檔同樣受 OFL 授權，再散布時必須一併附上授權條款。
