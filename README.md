# Word Together · 單字一起學

不用資料庫、不用 Firebase、不用安裝套件，直接上傳 GitHub Pages 的英文單字學習教室。

## 怎麼使用

1. 老師建立單字集，貼上 `apple,蘋果` 格式，每行一組。
2. 按「開教室」，保持老師分頁開啟。
3. 學生掃描 QR Code，或開啟相同網站輸入 6 碼教室代碼與名字。
4. 學生使用單字卡、精熟練習；老師即時查看排行榜與進度。
5. 老師可開始計時挑戰，或隨機分組、開始 Live。
6. 課後匯出 CSV 成績；單字集可匯出 JSON 備份。

首頁的「先試試範例」可以直接個人練習，不需要媒合服務或老師在線。

## 最簡單的 GitHub 上線（推薦）

不需要 `npm install`，也沒有 build 步驟。

1. GitHub 建立 **Public** repository，例如 `word-together`。
2. 使用 **Add file → Upload files**，把本專案檔案上傳到 repository 根目錄。不要把整個專案再包成一層資料夾，也不要直接上傳 ZIP。
3. 最少必須有：`index.html`、`app.js`、`engine.js`、`music.js`、`style.css`、`favicon.svg`、`vendor/`。推薦一併上傳 README、測試與其他設定。
4. **Settings → Pages → Build and deployment → Source → Deploy from a branch**。
5. 選擇 `main` 與 `/ (root)`，按 **Save**。
6. 等 Pages 顯示網站網址：`https://你的帳號.github.io/word-together/`。
7. 老師與學生都使用這個 HTTPS 網址。

若使用 Git 上傳，另附 `.github/workflows/pages.yml`。使用它時，Pages 的 Source 改選 **GitHub Actions**；每次推送 main 會先檢查與測試，再部署公開網頁檔案。兩種發布方式擇一即可。

GitHub 官方說明：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 檔案

| 檔案 | 用途 |
| --- | --- |
| index.html | 網站入口 |
| style.css | 手機、平板、電腦與投影介面 |
| app.js | 教師、學生介面與 PeerJS 通訊 |
| engine.js | 出題、精熟度、排序、Live 規則 |
| music.js | Live 原創輕快配樂、播放與音量控制 |
| vendor/peerjs.min.js | 固定版本 PeerJS 1.5.5 |
| vendor/qrcode.js | 固定版本 qrcode-generator 1.4.4 |
| server.cjs | 可選的本機預覽伺服器 |
| tests/engine.test.cjs | 核心行為測試 |
| .github/workflows/pages.yml | 可選的 GitHub Pages 自動發布 |

## 免 DB 如何跨裝置即時同步？

```text
GitHub Pages：提供 HTML / CSS / JavaScript 靜態檔案
                       ↓
PeerJS Cloud：介紹老師和學生的連線位置（signaling）
                       ↓
學生瀏覽器 ← WebRTC DataChannel → 老師瀏覽器
           答案、題目、排行榜、Live 分數
```

老師是教室主機，判分與組隊在老師裝置上執行。每個學生只連老師，學生之間不建立全互連網路。使用可靠 DataChannel，主機每次狀態變動合併約 120 ms 後廣播。這是**無資料庫**架構，但不是完全無外部服務：預設需要公共 PeerJS Cloud 媒合，並依賴可用的 WebRTC 網路路徑。

PeerJS 官方文件：https://peerjs.com/client/getting-started/
連線限制與 TURN：https://peerjs.com/client/faq/

### 網路限制

- 老師必須保持分頁開啟、電腦醒著；頁面會嘗試申請螢幕喚醒鎖，但支援度依瀏覽器而異。
- 某些校園防火牆、NAT 或媒合服務故障會使 WebRTC 失敗。純靜態網站無法保證每個網路都可連線。
- 公共 PeerJS Cloud 沒有本專案提供的可用性保證。需要穩定校園營運時，應配置自己的 PeerServer 及 TURN（仍不必使用 DB）。
- 本機預覽請用 `node server.cjs` 後開 `http://127.0.0.1:4173`。真正跨裝置請使用 GitHub Pages HTTPS，不使用 `file://`。
- 30～40 人的實際延遲取決於老師裝置與网络；請在實際校園網路先測一節課。測試不等同網路容量保證。

### 可選：自訂媒合與 TURN

預設不用填任何設定。若學校已提供 PeerServer/TURN，可由技術人員在每台需要自訂的瀏覽器 Console 設定 `wt-network`，重新開頁即讀取。支援欄位：`host`、`port`、`path`、`secure`、`iceServers`（WebRTC RTCIceServer 陣列）。僅自訂 TURN 時省略 host 等 PeerServer 欄位。

請使用學校實際提供的服務值，勿把私密 TURN 憑證提交到公開 GitHub；任何送到瀏覽器的 TURN 憑證都可被使用者看到，正式服務應使用有限時效的憑證。

## 已實作功能

- 單字集新增、修改、刪除、重排、批次解析、匯入與備份。
- 6 碼教室代碼、加入網址、本地生成 QR Code。
- 學生姓名加入、不註冊，裝置身份與教室進度恢復。
- 3D 翻牌、中英文正面切換、發音、標記、洗牌、弱字複習。
- 中翻英、英翻中、是非、拼字、聽力五種題型；題型輪替。
- 每字 0–100 精熟度，答對 +20、答錯 −10；錯字約三題後重現。
- 即時排行榜只呈現姓名、名次、精熟度；教師可看完整資料。
- 自訂 1–120 分鐘挑戰，預設 15 分鐘；截止成績快照與達標名單。
- 在線學生隨機分組、每組 4/5 人或自訂組數，教師確認後開賽。
- 團隊共享分數、錯題全隊歸零、版本防止重複計分、第一個到達目標即停止全場。
- 投影模式、全螢幕、學生改名／踢除、鎖定加入、關閉教室。
- 老師重整後使用「恢復上次教室」，學生自動嘗試重連。
- 老師 CSV 成績匯出、學生 JSON 成果匯出。

### Live 輕快背景音樂

老師按「開始比賽」後，預設播放原創 116 BPM 的輕快循環配樂。使用瀏覽器 Web Audio 合成旋律、和弦與低音，不需要下載音樂檔、網路串流或額外服務。

右下角可靜音、開啟及調整音量，設定保存在該裝置。學生端預設靜音，避免全班手機一起播放；需要時可自行開啟。比分更新及切換老師投影模式不會重頭播放；比賽結束、停止、離開 Live 或學生斷線時停止。

若瀏覽器阻擋自動播放，按右下角「播放音樂」即可。此配樂由各裝置自行播放，並非跨裝置同步音軌。

## 計分定義

- 每字精熟分數 ≥90 即「已精熟」。
- 整體精熟度 = 每字分數的平均。
- 答對率 = 正確題數 / 所有題數。
- 完成度 = 已精熟單字數 / 全部單字數。
- 排名順序：精熟度 → 答對率 → 已精熟字數 → 全數精熟時間 → 加入時間。
- 個人有效學習時間以回答間隔累積，每段最多 60 秒，屬活動時間估计，不是精確出席紀錄。
- 計時挑戰以老師裝置時間為準；學生使用主機時間偏差校正倒數。
- 挑戰使用既有累積精熟度，開始時不歸零。需要從零測驗可新開教室。

## 身份與資料

姓名、單字與進度存於瀏覽器 localStorage。老師頁面保留目前教室，每次變更稍後存檔；不是雲端備份。清除網站資料、換瀏覽器／裝置或突然關機可能遺失，請匯出資料。

學生以隨機 token 恢復身份，主機只接受該連線已綁定學生的答案。學生不能送入其他學生分數或直接覆寫 team score；主機驗答、檢查題目 ID／版本並拒絕截止後答案。這仍是課堂練習工具，不是防作弊考試系統：學生能看單字集、寫自動答題腳本、清除身份重新加入。教師可鎖定及踢除，沒有中央帳號、跨裝置身份驗證或持久封鎖。

老師關閉時學生暫停提交，不在離線期間猜測成功；恢復連線後重新同步。若老師開新教室，舊代碼無法自動連到新教室。開課前可備份成績，開新教室會取代本機「上次教室」。

## 驗證

只要 Node.js 就能執行，無安裝依賴：

```sh
node --check app.js
node --check engine.js
node --test tests/engine.test.cjs
node server.cjs
```

核心測試涵蓋解析、重送、分數上下限、錯題重現、排名隐私、40 人分組、同題競答、單一獲勝者及非法版本。瀏覽器與跨網路測試結果另見 `TESTING.md`。

## 第三方授權

PeerJS 與 qrcode-generator 採 MIT 授權。程式庫與授權隨 `vendor/` 提供，不需執行期 CDN 載入。此專案沒有 API key，也不應上傳任何學生匯出成績或身份 token 到 GitHub。
