(() => {
  "use strict";

  const apiBaseUrl = String(window.DAN_ISLAND_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  const songs = window.SONG_CATALOG || [];
  const songById = new Map(songs.map((song) => [song.id, song]));
  const fallbackCover = "assets/cover-fallback.svg";
  const podium = document.querySelector("#podium");
  const list = document.querySelector("#rankingList");
  const stats = document.querySelector("#leaderboardStats");
  const refreshButton = document.querySelector("#refreshLeaderboard");

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
  }

  function cover(song) {
    return `<img src="${escapeHtml(song.cover)}" alt="《${escapeHtml(song.title)}》封面" onerror="this.onerror=null;this.src='${fallbackCover}'">`;
  }

  function render(data) {
    const entries = (data.entries || []).map((entry) => ({ ...entry, song: songById.get(entry.songId) })).filter((entry) => entry.song);
    const top = entries.slice(0, 3);
    const podiumOrder = [top[1], top[0], top[2]].filter(Boolean);
    podium.innerHTML = podiumOrder.map((entry) => `
      <article class="podium-card podium-place-${entry.rank}">
        <span class="podium-rank">${entry.rank}</span>
        <div class="podium-cover">${cover(entry.song)}</div>
        <h2>${escapeHtml(entry.song.title)}</h2>
        <p>${escapeHtml(entry.song.release)}</p>
        <strong>${entry.score} 分</strong>
        <small>${entry.top1Count} 次 Top 1 · ${entry.supportCount} 份结果入围</small>
      </article>`).join("");

    const remaining = entries.slice(3, 50);
    list.innerHTML = remaining.length ? remaining.map((entry) => `
      <article class="ranking-row${entry.rank <= 10 ? " top-ten" : ""}">
        <span class="ranking-number">${String(entry.rank).padStart(2, "0")}</span>
        <div class="ranking-cover">${cover(entry.song)}</div>
        <div class="ranking-song"><b>${escapeHtml(entry.song.title)}</b><small>${escapeHtml(entry.song.release)}</small></div>
        <div class="ranking-score"><b>${entry.score}</b><small>加权分</small></div>
        <div class="ranking-top1"><b>${entry.top1Count}</b><small>Top 1</small></div>
      </article>`).join("") : '<p class="ranking-message">还没有足够的有效结果生成完整榜单。</p>';

    stats.innerHTML = `<span><b>${data.validSubmissions || 0}</b> 份有效结果</span><span><b>${data.pendingReview || 0}</b> 份待复核</span><span>更新于 ${new Date(data.generatedAt).toLocaleString("zh-CN")}</span>`;
  }

  function showError(message) {
    podium.innerHTML = "";
    list.innerHTML = `<p class="ranking-message error">${escapeHtml(message)}</p>`;
    stats.innerHTML = "<span>榜单暂不可用</span>";
  }

  async function load() {
    if (!apiBaseUrl) return showError("总榜接口尚未配置。请先在 config.js 中填写 Cloudflare Worker 地址。");
    refreshButton.disabled = true;
    try {
      const response = await fetch(`${apiBaseUrl}/api/leaderboard`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      render(data);
    } catch (error) {
      showError(`加载失败：${error.message}`);
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener("click", load);
  load();
})();
