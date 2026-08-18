# 字型檔案

本目錄的 `noto-sans-tc-*` 字型來自 **Noto Sans TC**（Google 開發），
以 **SIL Open Font License 1.1** 授權釋出。

- 完整授權條款：[`LICENSE-Noto-Sans-TC.txt`](./LICENSE-Noto-Sans-TC.txt)
- 上游套件：[`@fontsource/noto-sans-tc`](https://www.npmjs.com/package/@fontsource/noto-sans-tc)

## 檔案用途

| 檔案 | 用途 |
| --- | --- |
| `noto-sans-tc-pdf-400.woff`、`noto-sans-tc-pdf-700.woff` | 報價單 PDF 使用的字型（唯一會被讀取的字型檔） |

由 [`scripts/build-pdf-fonts.py`](../../scripts/build-pdf-fonts.py) 產生：
從 `node_modules/@fontsource/noto-sans-tc` 取常用漢字子集當基底，
併入補齊**全形標點**（：（），！？；％／）的其他子集，再切掉夾帶進來、
單據上用不到的字 —— 字型愈大瀏覽器產生 PDF 就愈慢。
來源檔案都在 node_modules，不需要在 repo 裡另外放一份。

之所以要合併：`chinese-traditional` 子集本身沒有全形標點，
直接拿來用的話，客戶名稱、地址、備註裡的標點會從印出來的單據上無聲消失。

之所以是 `.woff` 而非 `.woff2`：`@react-pdf/renderer` 內嵌 woff2 會在
瀏覽器端失敗，使用者只會看到「PDF 生成失敗」。細節見
[`src/lib/pdf-fonts.ts`](../../src/lib/pdf-fonts.ts)。

依 OFL 條款，衍生的字型檔同樣受 OFL 授權，再散布時必須一併附上授權條款。
