# PDF 字型

報價單 PDF 使用 Noto Sans TC。這份文件說明字型檔怎麼來的，以及為什麼是這個做法。

## 現況

| 項目 | 值 |
| --- | --- |
| 字型檔 | `public/fonts/noto-sans-tc-pdf-400.woff`、`noto-sans-tc-pdf-700.woff` |
| 格式 | **WOFF**（不可以是 WOFF2，見下） |
| 大小 | 各約 1.33 MB |
| 字數 | 約 6,700 字，含全形標點 |
| 產生方式 | `python3 scripts/build-pdf-fonts.py` |
| 註冊位置 | `src/lib/pdf-fonts.ts` |

重新產生字型：

```bash
pip install fonttools
npm install                        # 需要 node_modules/@fontsource/noto-sans-tc
python3 scripts/build-pdf-fonts.py
```

腳本會自我驗收：合併後若仍缺必要字元會直接失敗。`src/lib/pdf-fonts.test.ts`
也會檢查產出的檔案是 WOFF、且涵蓋單據上會用到的標點。

## 為什麼不能用 WOFF2

`@react-pdf/renderer` 在瀏覽器端內嵌 WOFF2 會丟出
`Cannot read properties of undefined (reading 'version')`，PDF 完全產不出來，
使用者只會看到「PDF 生成失敗，請稍後再試」。

這個故障**只發生在瀏覽器**。同一個 WOFF2 檔在 Node 下用 `renderToBuffer`
可以正常產出 PDF —— 因為打包給瀏覽器的 fontkit 需要一個以 `data:` URI
載入的 brotli WebAssembly 模組，Node 版走的是另一條路徑。

這代表**任何 Node 端的測試都覆蓋不到這個故障**，所以守門的方式是靜態檢查
檔頭必須是 `wOFF`（`src/lib/pdf-fonts.test.ts`），而不是產一份 PDF 出來看。
改字型後請一併用瀏覽器實際下載一張帳單確認。

## 為什麼要自己合併子集

`@fontsource/noto-sans-tc` 把字型切成一百多個 unicode-range 子集，瀏覽器
按需載入；但 PDF 產生器只吃單一檔案。

若直接拿其中的 `chinese-traditional` 子集來用（本專案 2026-08 之前的做法），
**該子集沒有全形標點**：`：（），！？；％／` 全部缺席。缺字不會報錯，
只會從印出來的單據上消失 —— 客戶名稱、地址、備註裡的標點就這樣不見，
收到的人也不會知道。

`scripts/build-pdf-fonts.py` 的做法：

1. 以 `chinese-traditional` 子集為基底（常用漢字）。
2. 掃過所有子集，挑出能補齊缺字的那些（目前 20 個）合併進來。
3. 合併會夾帶大量用不到的漢字，所以再切一次，只留基底原有的字加上要補的標點。
   同時關掉 `layout_closure` —— 開著會為了直排替代字把字數從 6.7k 拉到 9.8k。

第 3 步不是為了省空間而已：字型愈大瀏覽器產生 PDF 就愈慢。實測同一張帳單，
2.0 MB 版本要 34 秒、1.33 MB 版本 21 秒（容器內 headless Chromium，
絕對值偏高，重點是差距）。

上游本身沒有的 40 個罕用符號（bidi 控制字元、假名重複符號等）不列入驗收。

## 授權

Noto Sans TC 以 SIL Open Font License 1.1 釋出，版權行為 "Google Inc."，
**沒有** Reserved Font Name 宣告，因此衍生字型沿用原名稱是允許的。
授權條款必須隨字型一起散布，見 `public/fonts/LICENSE-Noto-Sans-TC.txt`。

字型內部名稱顯示為 "Noto Sans TC Thin" —— 這是上游 fontsource 的命名方式，
`usWeightClass` 仍正確是 400 / 700，不影響輸出。

## 故障排除

**PDF 生成失敗**：先看瀏覽器 console。若堆疊指向 `embed` / `encode`，
八成是字型格式問題 —— 確認 `pdf-fonts.ts` 指到的是 `.woff`。

**某些字變成空白**：字型缺字。把該字元加進 `scripts/build-pdf-fonts.py`
的 `REQUIRED` 範圍後重新產生，並在 `src/lib/pdf-fonts.test.ts` 的
`REQUIRED_TEXT` 補上，避免以後又被切掉。

## 歷史

2026-08 之前，本目錄記載的是一套「子集化成 WOFF2」的流程，宣稱已解決
全形冒號問題。實測不成立：當時產出的 woff2 並不含 U+FF1A，而且 WOFF2
本身就會讓 PDF 產不出來。相關腳本
（`generate-font-subset.js`、`optimize-fonts.ps1`、`Update-PdfFontConfig.ps1`）
已移除，以免有人照著跑再把設定改回 WOFF2。
