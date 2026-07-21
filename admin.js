(() => {
  "use strict";
  const api = String(window.DAN_ISLAND_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  const songById = new Map((window.SONG_CATALOG || []).map((song) => [song.id, song]));
  const tokenInput = document.querySelector("#adminToken");
  const login = document.querySelector("#adminLogin");
  const panel = document.querySelector("#adminPanel");
  const list = document.querySelector("#adminList");
  const message = document.querySelector("#adminMessage");
  const filter = document.querySelector("#adminFilter");
  const dialog = document.querySelector("#adminDialog");
  const detail = document.querySelector("#adminDetail");
  let token = sessionStorage.getItem("dan-island-admin-token") || "";

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
  const seconds = (value) => `${(Number(value || 0) / 1000).toFixed(1)} 秒`;
  const songTitle = (id) => songById.get(id)?.title || id || "跳过";

  async function request(path, options = {}) {
    if (!api) throw new Error("请先在 config.js 配置 Worker 地址");
    const response = await fetch(`${api}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  function effectiveStatus(item) {
    if (item.reviewStatus) return item.reviewStatus;
    return item.autoStatus === "suspect" ? "suspect" : "valid";
  }

  function renderRows(items) {
    list.innerHTML = items.length ? items.map((item) => {
      const status = effectiveStatus(item);
      return `<article class="admin-row status-${status}" data-id="${item.id}">
        <div class="admin-id"><b>#${item.id}</b><small>${escapeHtml(new Date(`${item.updatedAt}Z`).toLocaleString("zh-CN"))}</small></div>
        <div><span class="status-pill">${status === "suspect" ? "待复核" : status === "valid" ? "有效" : "无效"}</span><small>Top 1：《${escapeHtml(songTitle(item.championId))}》 · ${escapeHtml((item.autoFlags || []).join(" · ") || "无自动标记")}</small></div>
        <div><b>${seconds(item.durationMs)}</b><small>${item.choiceCount} 次选择 · 中位 ${seconds(item.medianChoiceMs)}</small></div>
        <div class="admin-actions"><button type="button" data-action="detail">详情</button><button type="button" data-action="valid">计入</button><button type="button" data-action="invalid">无效</button><button type="button" data-action="auto">恢复自动</button></div>
      </article>`;
    }).join("") : '<p class="ranking-message">当前筛选下没有提交。</p>';
  }

  async function load() {
    message.textContent = "正在读取提交记录…";
    try {
      const data = await request(`/api/admin/submissions?status=${encodeURIComponent(filter.value)}&limit=100`);
      login.hidden = true;
      panel.hidden = false;
      renderRows(data.submissions || []);
      message.textContent = `已加载 ${data.submissions?.length || 0} 条记录。`;
    } catch (error) {
      message.textContent = error.message;
      if (/Unauthorized/i.test(error.message)) { login.hidden = false; panel.hidden = true; sessionStorage.removeItem("dan-island-admin-token"); }
    }
  }

  async function update(id, reviewStatus) {
    const note = reviewStatus === "invalid" ? prompt("可选：填写判为无效的原因", "选择速度异常") : "";
    if (note === null) return;
    await request(`/api/admin/submissions/${id}`, { method: "PATCH", body: JSON.stringify({ reviewStatus, note }) });
    await load();
  }

  async function showDetail(id) {
    detail.innerHTML = "<p>正在读取详情…</p>";
    dialog.showModal();
    try {
      const data = await request(`/api/admin/submissions/${id}`);
      const item = data.submission;
      const events = item.payload?.events || [];
      detail.innerHTML = `<p class="eyebrow">SUBMISSION #${item.id}</p><h2>选择耗时明细</h2>
        <div class="admin-detail-summary"><span>总用时 <b>${seconds(item.durationMs)}</b></span><span>自动判断 <b>${escapeHtml(item.autoStatus)}</b></span><span>尝试次数 <b>${data.attempts?.length || 0}</b></span></div>
        <p class="admin-flags">标记：${escapeHtml((item.autoFlags || []).join(" · ") || "无")}</p>
        <div class="event-list">${events.map((event, index) => `<div><b>${index + 1}. ${escapeHtml(event.phase)}</b><span>${seconds(event.elapsedMs)}</span><small>${escapeHtml(Array.isArray(event.selected) ? event.selected.map(songTitle).join("、") : songTitle(event.selected))}</small></div>`).join("")}</div>`;
    } catch (error) { detail.innerHTML = `<p class="ranking-message error">${escapeHtml(error.message)}</p>`; }
  }

  document.querySelector("#adminConnect").addEventListener("click", () => { token = tokenInput.value.trim(); sessionStorage.setItem("dan-island-admin-token", token); load(); });
  document.querySelector("#adminRefresh").addEventListener("click", load);
  filter.addEventListener("change", load);
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    const row = event.target.closest("[data-id]");
    if (!button || !row) return;
    if (button.dataset.action === "detail") showDetail(row.dataset.id);
    else update(row.dataset.id, button.dataset.action);
  });
  document.querySelector("#adminDialogClose").addEventListener("click", () => dialog.close());
  if (token) load();
})();
