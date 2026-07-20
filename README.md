# PURE PICK · 单依纯歌曲 Battle

一个移动端优先、可直接部署到 GitHub Pages 的纯静态歌曲二选一应用。没有后端、没有第三方 CDN，也不会上传用户的选择记录。

## 已实现

- 64 强 / 全曲库（当前 69 首），可按专辑曲、单曲、OST、Live 及演唱形式筛选
- 全曲库会先进行 69→64 附加赛，再进入标准淘汰树，最多 68 次主动选择
- 智能首轮：热门候选分区，同来源 / 同演唱形式 / 同气质优先相遇
- “都不熟悉”会让本组记为轮空，不随机替用户选择，也不表示两首都喜欢
- 每轮结束进入检查页，展示晋级名单和当前完整晋级图
- 最终页直接展示从 64 强到冠军的七列晋级图
- 完整单败淘汰流程、撤回、自动保存和断点继续
- 冠军之路、最终四强与 1440 × 2400 完整晋级长图
- PNG 下载、支持的手机浏览器可调用系统分享
- PWA 离线缓存，可“添加到主屏幕”作为简易 App 使用
- 响应式布局、键盘焦点与减少动态效果适配

## 本地预览

不要直接双击 HTML（PWA 离线功能需要 HTTP 环境），在本目录启动任意静态服务器：

```powershell
python -m http.server 8000
```

然后打开 `http://localhost:8000`。

## 部署到 GitHub Pages

1. 将 `SYC128` 目录中的文件提交到 GitHub 仓库。
2. 进入仓库 **Settings → Pages**。
3. 在 **Build and deployment** 中选择 **Deploy from a branch**。
4. 选择包含这些文件的分支和目录（根目录请选择 `/ (root)`），保存。
5. 等待 GitHub 给出 `https://用户名.github.io/仓库名/` 地址。

所有运行依赖均已放在仓库内，没有 Google Fonts、npm CDN 或海外接口等额外网络请求，因此在可访问 GitHub Pages 的网络环境里不会出现“页面打开但依赖加载失败”。不过 `github.io` 在中国内地的连通性由当地网络与 GitHub 决定，静态代码本身无法承诺所有运营商、所有时段均可访问。若需要商业级稳定性，应另配已备案的中国内地静态托管/CDN。

## 维护曲库与热度

编辑 [`songs.js`](songs.js)。每首歌的数据结构如下：

```js
{
  id: "唯一英文标识",
  title: "歌名",
  source: "album",       // album | single | ost | live | other
  sourceLabel: "专辑曲",
  vocal: "solo",         // solo | collab
  vocalLabel: "独唱",
  mood: "抒情",
  release: "电视剧《示例作品》· 主题曲",
  seedScore: 74,         // 仅用于种子分区，不在页面展示
  cardTextKind: "听感提示",
  cardLines: ["第一条短提示", "第二条短提示"],
  quote: "结果页文案",
  colors: ["#5b21b6", "#a855f7"],
}
```

当前为 69 首：第二张专辑的先行版与正式版同名曲已经合并，《珠玉》《有趣》的 Live 版也已移除。网页不保存或展示任何平台收藏数据。受歌词版权限制，每首歌只使用不超过 10 个词的极短歌词摘录；没有可靠短摘录时显示原创“听感提示”，不会把杜撰文字冒充歌词。

部分影视出处核对参考：[Apple Music《风无眠》](https://music.apple.com/cn/song/1860218751)、[Apple Music《执》](https://music.apple.com/cn/album/%E6%89%A7-%E4%BA%BA%E4%B9%8B%E5%88%9D-%E7%94%B5%E8%A7%86%E5%89%A7%E6%8F%92%E6%9B%B2-single/1864010424)、[Spotify《续写》](https://open.spotify.com/track/6a0Uew5dKWqwgQMYWdFFbu)、[芒果 TV《你的珍藏》](https://www.mgtv.com/b/337744/10523764.html)、[Apple Music《月上歌》](https://music.apple.com/cn/song/1818945327)。

修改静态文件后，如果测试设备仍看到旧页面，请继续递增 `sw.js` 中的缓存版本号（如把 `pure-pick-v2` 改为 `pure-pick-v3`），以刷新离线缓存。
