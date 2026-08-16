# 官方網站

`https://vaalrl.github.io/public-luk/` 的原始檔。

純靜態單頁，沒有建置步驟 —— 直接改 `index.html` 即可。
推送到 `main` 且變動落在 `website/` 底下時，
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) 會自動部署。

## 內容

| 路徑 | 說明 |
|---|---|
| `index.html` | 整個頁面，樣式內嵌 |
| `fonts/` | Noto Sans TC 子集（SIL OFL 1.1，授權條款同目錄） |
| `img/` | 應用程式畫面截圖與 logo |

## 首次啟用

在 repo 的 **Settings → Pages** 把 **Source** 設為 **GitHub Actions**，
之後推送就會自動部署。

## 更新截圖

截圖使用虛構的示範資料，請勿放入任何真實客戶資料。
產生方式：以示範資料庫啟動應用程式後，用無頭瀏覽器擷取
`/`、`/invoicing`、`/reconciliation` 三個畫面。
