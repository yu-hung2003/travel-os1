# Travel OS

Offline-first Travel Operating System（PWA · Mobile First）

第一個旅程：2026 京阪夏日 7 天 6 夜。

## 本機開發

```bash
npm install     # 第一次執行,安裝套件
npm run dev     # 開發模式,瀏覽器開 http://localhost:5173
npm run build   # 產出正式版到 dist/
npm run preview # 在本機預覽正式版(含 PWA Service Worker)
```

> PWA / 離線功能只在 `build + preview` 或正式部署後生效,`npm run dev` 不會註冊 Service Worker,這是正常的。

## 技術棧

React 18 · TypeScript (strict) · Vite · Tailwind CSS · Zustand · Dexie (IndexedDB) · vite-plugin-pwa

## 專案結構

```
src/
├─ app/          路由、App Shell、Bottom Navigation
├─ features/     功能垂直切分（dashboard / timeline / trips / expense / map / more）
├─ data/         Dexie schema 與 Repository（UI 不直接碰資料庫）
├─ domain/       純型別與商業邏輯,零依賴
├─ shared/       共用元件與 hooks
└─ styles/       主題 tokens（Light / Dark / Auto）
```

## Roadmap

- [x] Phase 1 骨架:路由、主題、Bottom Nav、Dexie schema
- [ ] Phase 2 Trip 資料模型 + 京阪行程匯入
- [ ] Phase 3 Timeline(狀態機、拖曳、備註)
- [ ] Phase 4 Dashboard 今日視圖
- [ ] Phase 5 Expense
- [ ] Phase 6 PWA 離線化 + iOS 安裝優化
- [ ] Phase 7 Journal / Packing
- [ ] Phase 8 Weather + Google Maps(需申請 API key)
- [ ] Phase 9 Smart Replanning + AI Suggestion
