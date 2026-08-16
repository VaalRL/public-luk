# 發布檢查清單

快速檢查清單，確保產品準備好發布。

## ✅ 執行清理

```powershell
# 執行自動清理腳本
.\cleanup-for-release.ps1
```

## ✅ 程式碼檢查

- [ ] 移除所有 `console.log`
- [ ] 移除所有 `debugger`
- [ ] 移除所有 `TODO` 和 `FIXME` 註解
- [ ] 程式碼格式化完成 (`npm run format`)
- [ ] ESLint 無錯誤 (`npm run lint`)

## ✅ 測試

- [ ] 所有單元測試通過 (`npm test`)
- [ ] 執行快速測試指南中的 5 分鐘測試
- [ ] 執行關鍵路徑測試
- [ ] 無 Critical 或 High 嚴重性缺陷

## ✅ 建置

- [ ] 開發建置成功 (`npm run dev`)
- [ ] 生產建置成功 (`npm run build`)
- [ ] 建置產物大小合理 (< 5MB)

## ✅ 文件

- [ ] README.md 更新完成
- [ ] 包含安裝步驟
- [ ] 包含使用說明
- [ ] 包含環境變數說明
- [ ] .env.example 檔案存在且完整

## ✅ 安全

- [ ] .env 檔案在 .gitignore 中
- [ ] 無硬編碼的密碼或 API 金鑰
- [ ] 無敏感資訊在程式碼中
- [ ] 依賴套件無已知漏洞 (`npm audit`)

## ✅ Git

- [ ] 所有變更已提交
- [ ] Commit 訊息清楚
- [ ] 無大型二進位檔案
- [ ] .gitignore 設定正確

## ✅ 發布

- [ ] 建立 Git 標籤 (`git tag -a v1.0.0 -m "Release 1.0.0"`)
- [ ] 推送到遠端 (`git push origin main --tags`)
- [ ] 在 GitHub 建立 Release
- [ ] 附上變更日誌

---

## 快速命令

```bash
# 1. 清理
.\cleanup-for-release.ps1

# 2. 檢查
npm run lint
npm test
npm run build

# 3. 提交
git add .
git commit -m "chore: prepare for release v1.0.0"
git tag -a v1.0.0 -m "Release version 1.0.0"

# 4. 推送
git push origin main
git push origin v1.0.0
```

---

**完成以上所有項目後，即可發布！** 🎉
