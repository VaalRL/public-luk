# 官方網站

`https://vaalrl.github.io/public-luk/` 的原始檔。

純靜態，沒有建置步驟 —— 直接改 HTML 即可。中英兩個版本各是一個檔案。
推送到 `main` 且變動落在 `website/` 底下時，
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) 會自動部署。

## 內容

| 路徑 | 說明 |
|---|---|
| `index.html` | 英文版頁面（預設語言） |
| `zh.html` | 中文版頁面 |
| `en.html` | 轉址頁；英文版原本在這裡，留著接住既有連結 |
| `style.css` | 兩個版本共用的樣式 |
| `theme.js` | 主題切換（無閃爍的初始化腳本仍內嵌在各頁 `<head>`） |
| `fonts/` | Noto Sans TC 子集（SIL OFL 1.1，授權條款同目錄） |
| `img/` | 應用程式畫面截圖與 logo |

## 中英雙語

兩個語言版本是各自獨立的 HTML，沒有 JavaScript 切換，因此搜尋引擎與
沒有 JS 的環境都能正確取得內容。互相以 `<link rel="alternate" hreflang>`
標示，導覽列右上角有切換連結。

**改文案時兩邊都要改。**兩份 HTML 的區塊 `id` 與 class 必須保持一致，
樣式才會共用得起來。

英文是預設語言（`index.html`），因為讀者以 GitHub 上的開發者為主；
`hreflang` 的 `x-default` 也指向它。

## 主題

預設淺色，而不是跟隨作業系統 —— 這個網站的內容是帳頁，淺色是它該有的樣子。
使用者按下「系統」時會把 `"system"` 存進 `localStorage`，
`<head>` 的初始化腳本看到這個值才不套用淺色。
沒存過任何值代表沒選過，一律淺色。

## 首次啟用

在 repo 的 **Settings → Pages** 把 **Source** 設為 **GitHub Actions**，
之後推送就會自動部署。

## 更新截圖

截圖使用虛構的示範資料，請勿放入任何真實客戶資料。
產生方式：以示範資料庫啟動應用程式後，用無頭瀏覽器擷取
`/`、`/invoicing`、`/reconciliation` 三個畫面。
