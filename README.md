# 蛋岛环游记 · 单依纯歌曲探险

一个移动端优先、可直接部署到 GitHub Pages 的歌曲偏爱测试。静态页面可独立运行；配置 Cloudflare Worker 后，完整结果会匿名汇入岛民总榜。封面、二维码生成器和视觉素材均随项目本地托管。

## 玩法

- 曲库共 166 首。专辑曲与个人单曲固定加入；影视原声、演唱会、晚会和每档综艺可在出发前逐项开关。默认开启影视原声及“经典音乐综艺”组，其他音乐综艺默认关闭。
- 可以选择“只保留独唱”或“包含合唱”。合唱不是独立来源分类，而是个人单曲或其他来源上的 `collab` 标签。
- 固定采用 32 强路线：32 强 → 16 强 → 8 强 → 4 强 → 2 强 → 心中 Top 1。首轮以最多四选一快速海选；若胜者少于 27 首，会从离岛歌曲中追加若干场四选一加赛，因此最终手动送回的遗珠永远不超过 5 首。进入淘汰赛后，同综艺、OST 与晚会舞台优先内部对决，专辑和个人单曲尽量避免过早相遇；选择速度只控制同一对阵中的上下位置。
- “都不熟悉”只在第一轮出现；被跳过的组会增加复活名额，不会随机替用户选择。
- 海选后按需要进入潮汐复活或最后席位加赛，再进行完整的 32 强淘汰赛。十六进八结束后，可从本轮遗珠中选择一首挑战八强里种子顺位最低且并非原对手的歌曲；阶段页统一展示完整晋级轨迹，未产生的轮次留空。
- 每次选择均可撤回，包含最终决选。
- 最终页直接展示完整晋级轨迹，并生成适配手机纵横比的 900 × 1950 PNG 结果图；图片采用逐轮等高列式晋级表，字号与格高从左向右递增，底部内含本页二维码。
- 状态保存在当前浏览器的 `localStorage` 中，可中途退出后继续。

## 视觉与封面

“蛋岛环游记”使用浅色网格、手作拼贴卡片与蓝绿色水波构成轻盈的音乐旅行感，优先适配手机竖屏操作。单依纯本人是蛋岛岛主，测试结果表示用户心里的单曲 Top 1。

手机端歌曲卡采用手作纸张风格：标题保持深色无衬线字，装饰改为单一柔和彩块，避免斑点与斜线叠加；左侧封面锁定为完整 1:1 显示，分类标签仅轻搭封面边缘。

当前 166 首歌中有 97 首本地封面，存放在 `assets/covers/`；同一档音综统一复用一张封面，专辑与单曲仍保留版本差异。未匹配到的歌曲显示 `assets/cover-fallback.svg`。来源与匹配信息见 `assets/covers/manifest.json`。浏览网页时不会再请求 Apple Music、QQ 音乐或网易云音乐。

如需重新抓取公开的 Apple Music/iTunes 封面，在本目录运行：

```powershell
python scripts/fetch_covers.py
```

二维码由本地 vendored 的 MIT 开源 `qrcode-generator` 生成，不依赖运行时 CDN。

## 本地预览

PWA 离线功能需要 HTTP 环境。在本目录启动任意静态服务器：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

手机端视觉验收固定使用 `390 × 844` 与 `393 × 873` 两种 CSS 视口，不再使用其他模拟尺寸。

可用内置脚本生成精确设备视口截图：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/capture_mobile.ps1 -Url http://localhost:8000 -Width 390 -Height 844 -Output mobile-390x844.png
```

## 部署到 GitHub Pages

1. 将 `SYC128` 目录里的文件提交到 GitHub 仓库。
2. 打开仓库的 **Settings → Pages**。
3. 在 **Build and deployment** 选择 **Deploy from a branch**。
4. 选择目标分支；若本项目位于仓库根目录，目录选择 `/ (root)`。
5. 保存并等待 GitHub 生成站点地址。

项目没有海外运行依赖，但 `github.io` 在中国内地的连通性仍取决于当地网络和 GitHub，无法保证所有运营商、所有时段均可访问。若需要商业级稳定性，应另配已备案的内地静态托管或 CDN。

## 维护曲库

曲库位于 `songs.js` 的 `rawSongs`：

```js
["id", "歌名", "album", "solo", "情绪标签", "专辑《示例》", 80]
```

- 来源类型：`album`、`single`、`ost`、`live`、`variety`、`other`；演唱会与晚会舞台归入 `live`，《歌手2025》归入音乐综艺 `variety`。
- 演唱形式：`solo` 或 `collab`。例如合唱个人单曲使用 `source: "single"` 和 `vocal: "collab"`。
- `seedScore` 只用于首轮分区，不在页面展示，也不对应任何平台播放量或收藏量。
- 每首歌生成后都有 `lyricExcerpt` 字段。请在 `HIGHLIGHT_LYRICS` 中按歌曲 `id` 人工填写高光歌词；留空时卡片显示原创听感提示。较长歌词可在字符串中写 `\n`，手动指定卡片中的换行位置，例如 `"第一句\n第二句"`。
- 修改静态文件后如测试设备仍显示旧页面，请递增 `sw.js` 的缓存版本以刷新离线缓存。

## Cloudflare D1 总榜

网站仍部署在 GitHub Pages，提交与榜单接口运行在 Cloudflare Worker，数据保存在 D1。公开榜单位于 `leaderboard.html`，人工复核页位于 `admin.html`。

计分采用晋级层级权重：Top 1 为 100 分、亚军 70 分、四强 45 分、八强 28 分、十六强 16 分、三十二强 8 分。同一淘汰轮内视为并列。每个匿名设备在公开统计中只有一份当前结果，再次完成测试会更新该结果；每次提交尝试仍会保存在审计表中。

### 首次部署

需要安装 Node.js 和 Wrangler，并登录自己的 Cloudflare 账号：

```powershell
npx wrangler login
cd cloudflare
npx wrangler d1 create dan-island-ranking
```

把命令返回的 `database_id` 填入 `cloudflare/wrangler.toml`，然后初始化远程数据库：

```powershell
npx wrangler d1 execute dan-island-ranking --remote --file=schema.sql
```

设置两个不会进入仓库的 Secret：

```powershell
npx wrangler secret put DEVICE_SALT
npx wrangler secret put ADMIN_TOKEN
```

`DEVICE_SALT` 使用随机长字符串；`ADMIN_TOKEN` 是访问人工复核页时输入的管理令牌。最后部署：

```powershell
npx wrangler deploy
```

将部署结果中的 `https://...workers.dev` 地址填入项目根目录 `config.js` 的 `apiBaseUrl`。如果 GitHub Pages 使用了自定义域名，也要把该域名加入 `cloudflare/wrangler.toml` 的 `ALLOWED_ORIGINS` 后重新部署。

### 自动检测与人工复核

Worker 默认把以下提交标为 `suspect`，暂不计入总榜，但不会删除：

- 整体用时少于 60 秒；
- 可审计选择记录少于 40 次；
- 45% 以上的选择快于 350 毫秒；
- 单步选择耗时中位数低于 350 毫秒。

阈值可在 `cloudflare/wrangler.toml` 中调整。访问 `admin.html`，输入 `ADMIN_TOKEN` 后，可以查看每一步选择耗时，将记录手动设为“有效”“无效”或恢复自动判断，并添加无效原因。管理令牌只进入 Worker 的 `Authorization` 请求头并保存在标签页级 `sessionStorage`，不要将它写入 `config.js`。
