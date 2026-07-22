(() => {
  "use strict";

  const configured = Array.isArray(window.DAN_ISLAND_CONFIG?.apiBaseUrls) ? window.DAN_ISLAND_CONFIG.apiBaseUrls : [];
  const apis = [...new Set([...configured, window.DAN_ISLAND_CONFIG?.apiBaseUrl]
    .map((value) => String(value || "").replace(/\/$/, "")).filter(Boolean))];
  const storageKeys = ["dan-island-odyssey-v15", "dan-island-odyssey-v14", "dan-island-odyssey-v13", "dan-island-odyssey-v12", "dan-island-odyssey-v11", "dan-island-odyssey-v10", "dan-island-odyssey-v9"];
  const box = document.querySelector("#checks");
  const report = [];

  function add(name, ok, summary, detail = "") {
    report.push(`[${ok ? "正常" : "异常"}] ${name}\n${summary}${detail ? `\n${detail}` : ""}`);
    const card = document.createElement("section");
    card.className = "check";
    const head = document.createElement("header");
    const title = document.createElement("b");
    const status = document.createElement("strong");
    const copy = document.createElement("div");
    title.textContent = name;
    status.className = ok ? "ok" : "fail";
    status.textContent = ok ? "正常" : "异常";
    copy.textContent = summary;
    head.append(title, status);
    card.append(head, copy);
    if (detail) {
      const pre = document.createElement("pre");
      pre.textContent = detail;
      card.append(pre);
    }
    box.append(card);
  }

  async function get(api, path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const start = performance.now();
    try {
      const response = await fetch(api + path, { cache: "no-store", signal: controller.signal });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
      return { ok: response.ok, status: response.status, ms: Math.round(performance.now() - start), data };
    } finally {
      clearTimeout(timer);
    }
  }

  function localState() {
    for (const key of storageKeys) {
      const raw = localStorage.getItem(key);
      if (raw) return { key, state: JSON.parse(raw) };
    }
    return null;
  }

  async function run() {
    box.innerHTML = "";
    report.length = 0;
    add("浏览器环境", navigator.onLine, navigator.onLine ? "浏览器报告当前在线。" : "浏览器报告当前离线。", JSON.stringify({
      time: new Date().toISOString(), pageOrigin: location.origin, apiOrigins: apis.map((api) => new URL(api).origin), userAgent: navigator.userAgent
    }, null, 2));

    try {
      const saved = localState();
      const state = saved?.state;
      const submission = state?.submission || {};
      const poster = state?.posterDiagnostics;
      add("本机上次结果", !state || submission.state !== "failed", state ? `数据版本 ${state.version}；上传状态：${submission.state || "未尝试"}` : "本机没有测试记录。", state ? JSON.stringify({
        storageKey: saved.key,
        phase: state.phase,
        catalogSize: state.catalogIds?.length || 0,
        bracketSize: state.firstStageTarget || 0,
        decisionCount: state.auditEvents?.length || 0,
        submission: {
          httpStatus: submission.httpStatus || 0,
          errorCode: submission.errorCode || null,
          errorMessage: submission.errorMessage || null,
          attemptedAt: submission.attemptedAt || null,
          endpointOrigin: submission.endpointOrigin || null,
          attempts: submission.attempts || []
        },
        poster: poster ? {
          state: poster.state,
          generatedAt: poster.generatedAt || poster.attemptedAt || null,
          canvas: poster.canvas || null,
          blobBytes: poster.blobBytes || 0,
          stageCounts: poster.stages?.map((stage) => `${stage.label}:${stage.ids.length}/${stage.expected}`) || [],
          issues: poster.issues || [],
          errorName: poster.errorName || null,
          errorMessage: poster.errorMessage || null
        } : null
      }, null, 2) : "");
    } catch (error) {
      add("本机上次结果", false, "无法读取本机记录。", String(error));
    }

    if (!apis.length) {
      add("API 配置", false, "config.js 未配置 apiBaseUrls。");
      return;
    }
    for (const api of apis) {
      const origin = new URL(api).origin;
      try {
        const health = await get(api, "/api/health");
        const failed = Object.entries(health.data?.checks || {}).filter(([, value]) => !value.ok).map(([key]) => key);
        add(`提交服务 ${origin}`, health.ok && health.data?.ok, health.ok && health.data?.ok ? `全部依赖正常（${health.ms}ms）。` : `HTTP ${health.status}；异常项：${failed.join(", ") || "未知"}`, JSON.stringify(health.data, null, 2));
      } catch (error) {
        add(`提交服务 ${origin}`, false, "无法连接 /api/health。", error.name === "AbortError" ? "请求超过 12 秒" : String(error));
      }
    }
  }

  document.querySelector("#run").addEventListener("click", run);
  document.querySelector("#copy").addEventListener("click", async () => {
    const value = report.join("\n\n");
    try {
      await navigator.clipboard.writeText(value);
      document.querySelector("#copy").textContent = "已复制";
    } catch {
      prompt("请长按复制", value);
    }
  });
  run();
})();
