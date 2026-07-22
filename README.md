# 蛋岛环游记 · 单依纯歌曲探险

一个移动端优先、可直接部署到 GitHub Pages 的歌曲偏爱测试。静态页面可独立运行；配置 Cloudflare Worker 后，完整结果会匿名汇入岛民总榜。封面、二维码生成器和视觉素材均随项目本地托管。

## 玩法

- 曲库共 169 首。首页提供个人作品、OST、现场翻唱三个板块，可选择任意一个、任意组合或全部；也可以选择“只保留独唱”或“包含合唱”。
- 现场翻唱默认全选，展开“详情设置”后可按经典音综、其他音综、晚会和演唱会翻唱四组继续细选，并精确到具体节目。
- 根据曲库大小自动采用 16、32 或 64 强路线。首轮以最多四选一快速海选；进入淘汰赛后，同综艺、OST 与晚会舞台优先内部对决，专辑和个人单曲尽量避免过早相遇；选择速度只控制同一对阵中的上下位置。
- “都不熟悉”只在第一轮出现；被跳过的组会增加复活名额，不会随机替用户选择。
- 海选后按需要进入潮汐复活或最后席位加赛，再进行完整的动态淘汰赛。十六进八结束后，可从本轮遗珠中选择一首挑战八强里种子顺位最低且并非原对手的歌曲；阶段页统一展示完整晋级轨迹，未产生的轮次留空。
- 每次选择均可撤回，包含最终决选。
- 最终页直接展示完整晋级轨迹，并生成适配手机纵横比的 900 × 1950 PNG 结果图；图片采用逐轮等高列式晋级表，字号与格高从左向右递增，底部标注曲库来源并内含本页二维码。
- 状态保存在当前浏览器的 `localStorage` 中，可中途退出后继续。

## 视觉与封面

“蛋岛环游记”使用浅色网格、手作拼贴卡片与蓝绿色水波构成轻盈的音乐旅行感，优先适配手机竖屏操作。单依纯本人是蛋岛岛主，测试结果表示用户心里的单曲 Top 1。

手机端歌曲卡采用手作纸张风格：标题保持深色无衬线字，背景使用较密的轻量斜线；左侧封面锁定为完整 1:1 显示。卡片分类标签只显示“专辑、单曲、演唱会、晚会、音综”五种短名称，并为三字标签与歌名预留固定间距。结果页按冠军、晋级轨迹和操作区依次展开。

当前封面存放在 `assets/covers/`；维护者移入 `assets/covers/nophoto/` 的缺图记录不会被页面加载，对应歌曲直接显示 `assets/covers/default.jpg`。同一档音综仍统一复用一张封面，专辑与单曲保留版本差异。浏览网页时不会请求 Apple Music、QQ 音乐或网易云音乐。

如曲库再次增加歌曲，可运行 `python scripts/generate_placeholder_covers.py` 补齐新的缺图路径；脚本不会覆盖已有图片，也不会改变节目共用封面映射。

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

## 腾讯云 CloudBase 内地主入口

当前内地主站为 `https://dan-island-d8gwz7m0v7cc4c765-1422249946.tcloudbaseapp.com/`，排行榜 API 为 `https://dan-island-d8gwz7m0v7cc4c765.service.tcloudbase.com/api`。公开页面只使用腾讯云 API；GitHub Pages 仅保留为旧二维码的兼容入口，页面加载后立即跳转腾讯云。所有新生成的二维码也固定指向腾讯云，避免两套浏览器本地状态和两套数据库继续分叉。

云函数源码位于 `tencent-cloudbase/functions/dan-island-proxy/`，配置位于 `cloudbaserc.json`。使用 Node.js 20 以上版本登录 CloudBase CLI 后，可分别部署函数和静态文件。默认 `tcloudbaseapp.com` 域名适合当前验证与过渡使用；正式长期面向内地用户时，仍建议准备已备案的自有域名并绑定 CloudBase。

Cloudflare Worker 只保留管理页兼容与历史备份，不再承接公开提交或榜单读取。离线补录结果图时，由维护者先人工核验 `scripts/result-image-imports.json` 中的 Top 16 至冠军，再运行 `node scripts/import_results_to_cloudbase.js --apply`；脚本会同时读取 Cloudflare 历史记录，并按完整 Top 16 结果指纹跳过数据库中已存在的数据。

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

## Cloudflare D1 榜单

网站仍部署在 GitHub Pages，提交与榜单接口运行在 Cloudflare Worker，数据保存在 D1。公开榜单位于 `leaderboard.html`，包含总榜、个人作品榜、OST 榜和现场翻唱榜；人工复核页位于 `admin.html`。

计分先采用 Top 1 / 亚军 / 四强 / 八强 / 十六强 / 三十二强 / 六十四强的 `100 / 70 / 45 / 28 / 16 / 8 / 4` 基础分，再在每份结果的总榜与所选分榜内分别归一化为 100 个偏爱点。榜单展示所有符合范围的有效结果的平均偏爱指数，因此选择更多板块不会增加单个设备的总榜票权，曲库大小差异也不会直接放大分榜分数。

同一淘汰轮内视为并列。每个匿名设备在公开统计中只有一份当前结果，再次完成测试会更新该结果；每次提交尝试仍会保存在审计表中。

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

已有数据库升级到多榜结构时，再执行一次：

```bash
npx wrangler d1 execute dan-island-ranking --remote --file=migrations/0002_multi_board_rankings.sql
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

将部署结果中的 `https://...workers.dev` 地址填入项目根目录 `config.js` 的 `apiBaseUrls`。数组会按顺序尝试，因此可把中国内地可达、实现相同 API 契约的接口放在第一项，把 Cloudflare Worker 留作境外兜底。如果静态站使用了自定义域名，也要把该域名加入各接口的 CORS 白名单。

面向中国内地用户时，不应把 `github.io` 和 `workers.dev` 作为唯一生产入口。建议把同一套静态文件镜像到中国内地云厂商的静态托管，并把提交 API 与数据库迁到同一家厂商的云函数与数据库；使用中国内地节点和自定义域名通常需要 ICP 备案。`shareUrl` 留空时，二维码会自动指向用户当前访问的镜像，避免又跳回 GitHub Pages。

### 自动检测与人工复核

Worker 默认把以下提交标为 `suspect`，暂不计入总榜，但不会删除：

- 整体用时少于 60 秒；
- 可审计选择记录不足动态赛制门槛（16／32／64 强分别采用 20／34／40 次，上限仍受部署配置控制）；
- 45% 以上的选择快于 350 毫秒；
- 单步选择耗时中位数低于 350 毫秒。

阈值可在 `cloudflare/wrangler.toml` 中调整。访问 `admin.html`，输入 `ADMIN_TOKEN` 后，可以查看每一步选择耗时，将记录手动设为“有效”“无效”或恢复自动判断，并添加无效原因。管理令牌只进入 Worker 的 `Authorization` 请求头并保存在标签页级 `sessionStorage`，不要将它写入 `config.js`。
