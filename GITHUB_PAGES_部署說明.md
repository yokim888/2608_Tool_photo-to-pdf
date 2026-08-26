# GitHub Pages 部署說明

這個專案保留兩套互不影響的使用方式：

- Windows 本機版：雙擊「啟動照片轉PDF.cmd」，或執行 `pnpm dev`
- GitHub Pages 版：推送到 GitHub 後，由 GitHub Actions 自動執行 `pnpm build:pages`

## 第一次發布

1. 在 GitHub 建立一個新的 Public repository，例如 `photo-to-pdf`。
2. 使用 GitHub Desktop 加入本機資料夾「離線圖片轉PDF」。
3. 將 repository 發布到剛建立的 GitHub repository。
4. 在 GitHub repository 開啟 Settings → Pages。
5. 在 Build and deployment 的 Source 選擇 GitHub Actions。
6. 開啟 Actions 頁面，等待「Deploy GitHub Pages」完成。
7. 網址通常是 `https://你的帳號.github.io/photo-to-pdf/`。

## 安裝到 iPhone

1. 使用 Safari 開啟 GitHub Pages 網址。
2. 點選分享按鈕。
3. 選擇「加入主畫面」。
4. 第一次完整開啟後，便可從主畫面離線使用。

照片與 PDF 都只在瀏覽器內處理，不會傳到 GitHub。
