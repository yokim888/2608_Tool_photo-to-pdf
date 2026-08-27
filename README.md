# 照片轉 PDF

> 在瀏覽器裡把多張照片排好順序，一鍵輸出成一份 PDF —— 全程離線處理、不上傳、不需要帳號。

[![Deploy GitHub Pages](https://github.com/yokim888/2608_Tool_photo-to-pdf/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/yokim888/2608_Tool_photo-to-pdf/actions/workflows/deploy-pages.yml)

## 這是什麼

選好照片、排好順序、按下「建立 PDF」，就能把多張照片合併成一份 PDF 文件。所有圖片解碼、排版與 PDF 產生都在你自己的瀏覽器裡完成，沒有伺服器、不會上傳，也不需要註冊帳號。

同一份程式碼提供兩種使用方式：

| 使用方式 | 適合情境 |
| --- | --- |
| Windows 桌面版 | 在自己的電腦上重複使用，雙擊 `.cmd` 檔即可啟動 |
| GitHub Pages（PWA） | 手機（尤其是 iPhone）或任何裝置，可加入主畫面離線使用 |

## 功能特色

- 多張照片一次匯入：可從相簿／檔案總管多選，也支援拖曳整批圖片到頁面上
- 支援常見格式：JPG、PNG、WEBP、GIF、BMP、HEIC、HEIF、AVIF、TIFF
- 排序與旋轉：用左右箭頭或拖曳調整順序，個別照片可 90° 旋轉
- 輸出設定可調整：
  - 檔案名稱
  - 頁面尺寸：A4（自動直／橫向）、Letter（自動直／橫向）、依照片比例
  - 頁面留白：無留白／窄邊界／標準邊界
  - 圖片畫質：精簡檔案／平衡（預設）／最高畫質
- 智慧儲存：桌面瀏覽器跳出「另存新檔」視窗；手機叫出系統分享選單；都不支援時改用一般下載
- 可安裝成 App：具備 Web App Manifest 與 Service Worker，第一次完整載入後可離線使用、加到主畫面
- 完全離線：照片與產生的 PDF 只暫存在目前分頁的記憶體中，重新整理或關閉分頁就會清除

## 快速開始

### 方式一：Windows 桌面版

面向：在自己（或家人）的 Windows 電腦上直接使用，不需要開終端機打指令。

1. 第一次使用，先雙擊 **`安裝或修復桌機環境.cmd`**
   - 自動檢查／安裝 Node.js（需 ≥ 22.13.0）與 pnpm
   - 找不到系統安裝時，會嘗試使用電腦上 Codex 內建的 Node.js／pnpm 當備援
   - 完成後會詢問是否要立即啟動
2. 之後要使用時，雙擊 **`啟動照片轉PDF.cmd`**
   - 啟動本機伺服器（`http://localhost:3000/`）並自動開啟瀏覽器
   - 若伺服器已在執行中，會直接開啟瀏覽器分頁
   - 要結束服務時，回到該視窗按 `Ctrl+C`，或直接關閉視窗

也可以自行手動執行（需先安裝好 Node.js ≥ 22.13.0 與 pnpm）：

```bash
pnpm install
pnpm dev
# 開啟 http://localhost:3000
```

> **首次在新電腦上 clone 時的注意事項**：本機版的 `dev`／`build`／`start` 目前仍需要一個 `.openai/hosting.json` 設定檔，但這個檔案沒有被加進版本控制。若在全新電腦上直接 `git clone` 後啟動，可能會看到類似 `Could not resolve './.openai/hosting.json'` 的錯誤。手動建立一個空設定檔即可解決：
>
> ```bash
> mkdir .openai && echo {} > .openai/hosting.json
> ```
>
> 建好之後重新執行 `安裝或修復桌機環境.cmd` 或 `pnpm dev` 即可正常啟動。GitHub Pages 版不受影響。

### 方式二：GitHub Pages（網頁版／PWA）

面向：想在手機上使用、或想用一個網址分享給其他人。

首次發布：

1. 在 GitHub 建立一個新的 Public repository
2. 將專案發布／推送到該 repository（例如透過 GitHub Desktop）
3. 到 repository 的 **Settings → Pages**，「Build and deployment」的 Source 選擇 **GitHub Actions**
4. 打開 **Actions** 分頁，等待 `Deploy GitHub Pages` 工作流程執行完成
5. 之後每次 push 到 `main` 分支都會自動重新部署（見 `.github/workflows/deploy-pages.yml`）

首次啟用完成後，網址通常會是：

```
https://yokim888.github.io/2608_Tool_photo-to-pdf/
```

安裝到 iPhone：

1. 用 **Safari** 開啟上面的網址
2. 點分享按鈕 →「加入主畫面」
3. 第一次完整開啟一次之後，即可離線從主畫面開啟使用

更完整的部署步驟另見 [GitHub Pages 部署說明](./GITHUB_PAGES_部署說明.md)。

## 隱私與安全

- 所有圖片解碼、旋轉、壓縮、排版都透過瀏覽器內建的 Canvas API 處理
- PDF 是用 `pdf-lib` 在瀏覽器裡組出來的，不經過任何後端伺服器
- 照片與產生的 PDF 只存在目前分頁的記憶體中，重新整理或關閉分頁就會清除
- GitHub Pages 版本同樣是純靜態網頁，不會把照片傳回 GitHub 或任何第三方

## 技術架構

| 項目 | 內容 |
| --- | --- |
| 框架 | Next.js 16（本機版）／Vite + React（GitHub Pages 靜態版）—— 兩者共用同一個 `app/page.tsx` 元件 |
| UI | React 19、Tailwind CSS 4 |
| PDF 產生 | pdf-lib |
| 語言 | TypeScript |
| 套件管理 | pnpm |
| 離線／PWA | Web App Manifest ＋ Service Worker（安裝時預先快取，離線可用） |
| CI/CD | GitHub Actions → GitHub Pages |

本機版的 `dev`／`build`／`start` 由 `vinext`（以 Vite 為基礎、相容 Next.js 指令的執行工具）驅動；`vinext` 會在背後啟用 Cloudflare Workers 本機模擬（`wrangler` ／ Miniflare）與 `@openai/sites-vite-plugin`，這是專案最初用 Codex 的網站建立工具產生時帶來的預設架構。實際會用到的發布方式目前只有「Windows 本機」與「GitHub Pages」兩種，未使用 Cloudflare 正式部署。

## 可用指令

| 指令 | 說明 |
| --- | --- |
| `pnpm dev` | 啟動本機開發伺服器（`http://localhost:3000`） |
| `pnpm build` | 建置本機版（正式環境用） |
| `pnpm start` | 啟動已建置好的本機版 |
| `pnpm dev:pages` | 啟動 Vite 開發伺服器，預覽 GitHub Pages 靜態版 |
| `pnpm build:pages` | 建置 GitHub Pages 靜態版（輸出到 `dist-pages/`，CI 會自動執行） |
| `pnpm lint` | 執行 ESLint 檢查 |

## 環境需求

- Node.js ≥ 22.13.0
- pnpm（建議 11.19.0，與 CI 使用版本一致；缺少時 `安裝或修復桌機環境.cmd` 會協助安裝）

## 專案結構

```text
.
├── app/                      # Next.js App Router：本機版入口與主要 UI 邏輯
│   ├── page.tsx               # 主畫面：選照片、排序、旋轉、輸出設定、產生 PDF
│   ├── layout.tsx             # 頁面 metadata／PWA 設定
│   └── manifest.ts            # 本機版 Web App Manifest
├── github-pages/              # GitHub Pages 靜態版入口（重用 app/page.tsx 同一元件）
│   ├── index.html
│   ├── main.tsx
│   └── manifest.webmanifest
├── public/                    # 圖示與 Service Worker（sw.js）
├── .github/workflows/         # deploy-pages.yml：推到 main 自動部署 GitHub Pages
├── 啟動照片轉PDF.cmd            # Windows：一鍵啟動本機版
├── 安裝或修復桌機環境.cmd        # Windows：一鍵安裝／修復 Node.js、pnpm、套件
└── GITHUB_PAGES_部署說明.md    # GitHub Pages 部署與安裝到 iPhone 的完整步驟
```

## 已知限制

- 「另存新檔」視窗（File System Access API）主要在桌面版 Chrome／Edge 等瀏覽器可用，不支援的瀏覽器會改用一般下載
- 手機上的儲存方式依賴系統分享選單（Web Share API），實際可選的儲存位置依裝置與已安裝的 App 而定
- HEIC／HEIF 等格式能否正確顯示與轉換，取決於瀏覽器本身是否能解碼該格式（例如 iPhone Safari 原生支援；部分桌面瀏覽器可能無法開啟，並顯示錯誤訊息）
