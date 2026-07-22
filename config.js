// 填入实现同一 API 契约的提交服务地址；地址末尾不需要斜杠。
// 数组留空时榜单功能停用，原有测试仍可正常使用。
window.DAN_ISLAND_CONFIG = {
  // 按顺序尝试。可把中国内地可达的同协议兼容接口放在第一项，
  // Cloudflare Worker 保留为境外兜底。
  apiBaseUrls: [
    "https://dan-island-d8gwz7m0v7cc4c765.service.tcloudbase.com",
    "https://dan-island-ranking-api.umikaze07kari.workers.dev"
  ],
  // 管理接口暂时仍由 Cloudflare Worker 提供。
  adminApiBaseUrl: "https://dan-island-ranking-api.umikaze07kari.workers.dev",
  // 留空时，二维码和“复制测试链接”使用用户当前打开的站点地址。
  shareUrl: ""
};
