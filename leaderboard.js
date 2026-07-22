(() => {
  "use strict";

  const configuredApiUrls = Array.isArray(window.DAN_ISLAND_CONFIG?.apiBaseUrls) ? window.DAN_ISLAND_CONFIG.apiBaseUrls : [];
  const apiBaseUrls = [...new Set([...configuredApiUrls, window.DAN_ISLAND_CONFIG?.apiBaseUrl]
    .map((value) => String(value || "").replace(/\/$/, "")).filter(Boolean))];
  const songs = window.SONG_CATALOG || [];
  const songById = new Map(songs.map((song) => [song.id, song]));
  const fallbackCover = "assets/cover-fallback.svg";
  const podium = document.querySelector("#podium");
  const list = document.querySelector("#rankingList");
  const stats = document.querySelector("#leaderboardStats");
  const refreshButton = document.querySelector("#refreshLeaderboard");
  const tabs = [...document.querySelectorAll("[data-board]")];
  const heading = document.querySelector("#leaderboardHeading");
  const eyebrow = document.querySelector("#leaderboardEyebrow");
  const intro = document.querySelector("#leaderboardIntro");
  const BOARD_META = {
    overall: { title: "岛民总榜", eyebrow: "ISLANDERS' OVERALL", intro: "三个分榜汇入同一张总榜。每份结果先归一化，选择更多板块不会获得额外票权。" },
    original: { title: "个人作品榜", eyebrow: "ORIGINAL WORKS", intro: "收录个人专辑与个人单曲，只统计选择过这一板块的有效结果。" },
    ost: { title: "OST 榜", eyebrow: "ORIGINAL SOUNDTRACKS", intro: "收录影视、游戏与节目原声，只统计选择过这一板块的有效结果。" },
    stage: { title: "现场翻唱榜", eyebrow: "LIVE STAGES", intro: "收录音综、晚会舞台与演唱会翻唱，只统计选择过这一板块的有效结果。" }
  };
  let activeBoard = new URLSearchParams(location.search).get("board") || "overall";
  if (!BOARD_META[activeBoard]) activeBoard = "overall";

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
        <strong>${entry.score} 偏爱指数</strong>
        <small>${entry.top1Count} 次本榜领跑 · ${entry.supportCount} 份结果入围</small>
      </article>`).join("");

    const remaining = entries.slice(3, 50);
    list.innerHTML = remaining.length ? remaining.map((entry) => `
      <article class="ranking-row${entry.rank <= 10 ? " top-ten" : ""}">
        <span class="ranking-number">${String(entry.rank).padStart(2, "0")}</span>
        <div class="ranking-cover">${cover(entry.song)}</div>
        <div class="ranking-song"><b>${escapeHtml(entry.song.title)}</b><small>${escapeHtml(entry.song.release)}</small></div>
        <div class="ranking-score"><b>${entry.score}</b><small>偏爱指数</small></div>
        <div class="ranking-top1"><b>${entry.top1Count}</b><small>领跑</small></div>
      </article>`).join("") : '<p class="ranking-message">还没有足够的有效结果生成完整榜单。</p>';

    stats.innerHTML = `<span><b>${data.eligibleSubmissions || 0}</b> 人参与本榜</span><span><b>${data.validSubmissions || 0}</b> 份有效结果</span><span><b>${data.pendingReview || 0}</b> 份待复核</span><span>更新于 ${new Date(data.generatedAt).toLocaleString("zh-CN")}</span>`;
  }

  function showError(message) {
    podium.innerHTML = "";
    list.innerHTML = `<p class="ranking-message error">${escapeHtml(message)}</p>`;
    stats.innerHTML = "<span>榜单暂不可用</span>";
  }

  async function load() {
    if (!apiBaseUrls.length) return showError("总榜接口尚未配置。请先在 config.js 中填写接口地址。");
    refreshButton.disabled = true;
    try {
      let lastError = null;
      for (const apiBaseUrl of apiBaseUrls) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(`${apiBaseUrl}/api/leaderboard?board=${encodeURIComponent(activeBoard)}`, { cache: "no-store", signal: controller.signal });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
          render(data);
          return;
        } catch (error) {
          lastError = error;
        } finally {
          clearTimeout(timer);
        }
      }
      throw lastError || new Error("所有榜单接口均不可达");
    } catch (error) {
      showError(`加载失败：${error.message}`);
    } finally {
      refreshButton.disabled = false;
    }
  }

  function selectBoard(board) {
    activeBoard = BOARD_META[board] ? board : "overall";
    const meta = BOARD_META[activeBoard];
    heading.textContent = meta.title;
    eyebrow.textContent = meta.eyebrow;
    intro.textContent = meta.intro;
    tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.board === activeBoard)));
    const url = new URL(location.href);
    if (activeBoard === "overall") url.searchParams.delete("board");
    else url.searchParams.set("board", activeBoard);
    history.replaceState(null, "", url);
  }

  refreshButton.addEventListener("click", load);
  tabs.forEach((tab) => tab.addEventListener("click", () => { selectBoard(tab.dataset.board); load(); }));
  selectBoard(activeBoard);
  load();
})();
