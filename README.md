# PURE ISLAND · 蛋岛选歌巡游

一个移动端优先、可直接部署到 GitHub Pages 的单依纯歌曲偏爱选择器。项目完全静态运行，没有后端、第三方 CDN，也不会上传用户的选择记录。

## 现在的赛制

- 曲库共 69 首，已合并《纯妹妹》不同版本，并移除《珠玉》《有趣》的 Live 版本。
- 专辑曲会获得轻量种子加成；1 号种子直达岛心，其余 68 首分为 17 组进行四选一。
- 首轮采用“高种子分层＋来源互斥＋组间强度平衡”：同专辑重复同组受到最高惩罚，分组顺序也会打散，避免连续出现数个特别难选的专辑组。
- “都不熟悉”只在第一阶段出现；跳过整组后不会随机代选，潮汐复活名额会自动增加。
- 海选胜者与复活歌曲凑齐二十强，随后进行 20→10、10→5 的双歌对决。
- 五强进入岛主议会，五选二后再二选一，产生唯一“蛋岛岛主”。
- 每个大阶段结束只显示一张简洁的六阶段巡游图；最终页展示完整晋级图，并可生成 1200 × 2000 PNG 长图。
- 状态自动保存在浏览器本机，支持中途退出和继续。

## 视觉与封面

“蛋岛”主题使用仓库内的矢量素材：苔绿岛屿、巨树、蛋形石、紫色潮汐和等高线，并加入像素网格、硬边阴影和电子状态标签。PK 卡片按专辑、OST、Live、单曲分别使用紫晶、海水蓝、珊瑚红、草木绿的单色系。所有界面与结果图均不依赖外部字体或图片服务。

当前 69 首歌中有 55 首成功匹配并下载了 Apple Music/iTunes 公开封面，存放在 `assets/covers/`；其余歌曲会自动显示统一的矢量封面 `assets/cover-fallback.svg`。浏览网页时不会再请求 Apple、QQ 音乐或网易云音乐。

封面来源和匹配信息记录在 `assets/covers/manifest.json`。需要重新抓取时，在本目录运行：

```powershell
python scripts/fetch_covers.py
```

## 本地预览

PWA 离线功能需要 HTTP 环境，请在本目录启动任意静态服务器：

```powershell
python -m http.server 8000
```

然后打开 `http://localhost:8000`。

## 部署到 GitHub Pages

1. 将 `SYC128` 目录中的文件提交到 GitHub 仓库。
2. 进入仓库 **Settings → Pages**。
3. 在 **Build and deployment** 中选择 **Deploy from a branch**。
4. 选择目标分支和目录；若这些文件就在仓库根目录，选择 `/ (root)`。
5. 保存并等待 GitHub 给出 `https://用户名.github.io/仓库名/` 地址。

代码没有海外运行依赖，但 `github.io` 在中国内地的连通性仍由当地网络和 GitHub 决定，无法保证所有运营商与所有时段都可访问。若需要商业级稳定性，应另配已备案的中国内地静态托管或 CDN。

## 维护曲库

编辑 `songs.js` 中的 `rawSongs`。每一行依次为：

```js
["id", "歌名", "album", "solo", "情绪标签", "专辑《示例》", 80]
```

- 来源类型：`album`、`single`、`ost`、`live`、`other`
- 演唱形式：`solo` 或 `collab`
- 最后的 `seedScore` 只用于首轮种子分区，不在页面中展示，也不对应任何平台播放或收藏数字。
- `SHORT_LYRIC_CUES` 只保存极短歌词摘录；其他歌曲显示原创听感提示，避免大段复制受版权保护的歌词。

修改静态文件后，如果测试设备仍显示旧版页面，请继续递增 `sw.js` 中的缓存名称，以刷新离线缓存。

部分影视出处核对参考：[Apple Music《风无眠》](https://music.apple.com/cn/song/1860218751)、[Apple Music《执》](https://music.apple.com/cn/album/%E6%89%A7-%E4%BA%BA%E4%B9%8B%E5%88%9D-%E7%94%B5%E8%A7%86%E5%89%A7%E6%8F%92%E6%9B%B2-single/1864010424)、[Spotify《续写》](https://open.spotify.com/track/6a0Uew5dKWqwgQMYWdFFbu)、[芒果 TV《你的珍藏》](https://www.mgtv.com/b/337744/10523764.html)、[Apple Music《月上歌》](https://music.apple.com/cn/song/1818945327)。
