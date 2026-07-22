// 填入实现同一 API 契约的提交服务地址；地址末尾不需要斜杠。
// 数组留空时榜单功能停用，原有测试仍可正常使用。
window.DAN_ISLAND_CONFIG = {
  // 所有公开页面只读写腾讯云，避免多数据库分叉。
  apiBaseUrls: [
    "https://dan-island-d8gwz7m0v7cc4c765.service.tcloudbase.com"
  ],
  // 管理接口暂时仍由 Cloudflare Worker 提供。
  adminApiBaseUrl: "https://dan-island-ranking-api.umikaze07kari.workers.dev",
  // 所有新生成的二维码固定指向腾讯云主站。
  shareUrl: "https://dan-island-d8gwz7m0v7cc4c765-1422249946.tcloudbaseapp.com/"
};
