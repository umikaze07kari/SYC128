(() => {
  "use strict";

  const songs = window.SONG_CATALOG || [];
  const STORAGE_KEY = "pure-island-journey-v4";
  const FALLBACK_COVER = "assets/cover-fallback.svg";
  const STAGE_COUNTS = [18, 20, 10, 5, 2, 1];
  const STAGE_LABELS = ["登岛", "复活20", "十强", "五强", "决赛", "岛主"];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = (id) => songs.find((song) => song.id === id);

  const els = {
    views: $$(".view"),
    continueJourney: $("#continueJourney"),
    stageEnglish: $("#stageEnglish"),
    stageTitle: $("#stageTitle"),
    stageCounter: $("#stageCounter"),
    roundProgress: $("#roundProgress"),
    choiceHint: $("#choiceHint"),
    choiceTitle: $("#choiceTitle"),
    choiceGrid: $("#choiceGrid"),
    unfamiliarAction: $("#unfamiliarAction"),
    matchNote: $("#matchNote"),
    selectionGrid: $("#selectionGrid"),
    selectionCount: $("#selectionCount"),
    selectionNeed: $("#selectionNeed"),
    confirmSelection: $("#confirmSelection"),
    checkpointRoute: $("#checkpointRoute"),
    finalRoute: $("#finalRoute"),
    aboutDialog: $("#aboutDialog"),
    posterDialog: $("#posterDialog"),
    canvas: $("#resultCanvas"),
    toast: $("#toast")
  };

  let state = null;
  let posterBlob = null;
  let toastTimer = null;

  function showToast(message) {
    $("#toast").textContent = message;
    $("#toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2100);
  }

  function showView(name) {
    els.views.forEach((view) => view.classList.toggle("active", view.id === `${name}View`));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function shuffled(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function similarity(a, b) {
    let score = 0;
    if (a.source === b.source) score += 5;
    if (a.vocal === b.vocal) score += 2;
    if (a.mood === b.mood) score += 3;
    score -= Math.abs(a.seedScore - b.seedScore) * .01;
    return score;
  }

  function makeLandingGroups(pool) {
    const ranked = [...pool].sort((a, b) => b.seedScore - a.seedScore);
    const directSeed = ranked.shift();
    const seeds = ranked.splice(0, 17);
    const remaining = [...ranked];
    const groups = seeds.map((seed) => {
      const group = [seed];
      while (group.length < 4) {
        let bestIndex = 0;
        remaining.forEach((candidate, index) => {
          if (similarity(seed, candidate) > similarity(seed, remaining[bestIndex])) bestIndex = index;
        });
        group.push(remaining.splice(bestIndex, 1)[0]);
      }
      return shuffled(group).map((song) => song.id);
    });
    return { directSeed: directSeed.id, groups };
  }

  function makeDuelPairs(ids) {
    const ranked = ids.map(byId).sort((a, b) => b.seedScore - a.seedScore);
    const upper = ranked.splice(0, ranked.length / 2);
    const lower = ranked;
    return upper.map((seed) => {
      let bestIndex = 0;
      lower.forEach((candidate, index) => {
        if (similarity(seed, candidate) > similarity(seed, lower[bestIndex])) bestIndex = index;
      });
      const opponent = lower.splice(bestIndex, 1)[0];
      return shuffled([seed.id, opponent.id]);
    });
  }

  function freshState() {
    const { directSeed, groups } = makeLandingGroups(songs);
    return {
      version: 4,
      createdAt: new Date().toISOString(),
      phase: "landing",
      directSeed,
      groups,
      groupIndex: 0,
      groupWinners: [],
      eliminated: [],
      duelPairs: [],
      duelIndex: 0,
      duelWinners: [],
      selection: [],
      selectionMode: null,
      revivalSlots: 0,
      top20: [],
      top10: [],
      top5: [],
      finalists: [],
      champion: null,
      checkpoint: null
    };
  }

  function save() {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved?.version === 4 ? saved : null;
    } catch {
      return null;
    }
  }

  function clear() {
    state = null;
    localStorage.removeItem(STORAGE_KEY);
    updateContinue();
  }

  function updateContinue() {
    const saved = load();
    els.continueJourney.hidden = !saved;
    if (saved) els.continueJourney.textContent = saved.phase === "complete" ? "查看上次岛主" : "继续上次巡游";
  }

  function imageMarkup(song, className = "") {
    return `<img class="${className}" src="${song.cover}" alt="《${song.title}》封面" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_COVER}'">`;
  }

  function shortLine(song) {
    return song.cardLines[0] || "听见属于它的独特颜色";
  }

  function choiceCard(song) {
    return `
      <button class="cover-choice" type="button" data-song-id="${song.id}">
        <div class="cover-frame">${imageMarkup(song)}<em>${song.sourceLabel}</em></div>
        <div class="choice-info">
          <h3>${song.title}</h3>
          <small>${song.release}</small>
          <div class="mini-lyric">${shortLine(song)}</div>
        </div>
      </button>`;
  }

  function startJourney() {
    state = freshState();
    save();
    renderCurrent();
  }

  function renderLanding() {
    const group = state.groups[state.groupIndex].map(byId);
    els.stageEnglish.textContent = "LANDING ROUND";
    els.stageTitle.textContent = "登岛海选 · 四选一";
    els.stageCounter.textContent = `${state.groupIndex + 1} / ${state.groups.length}`;
    els.roundProgress.style.width = `${(state.groupIndex / state.groups.length) * 100}%`;
    els.choiceHint.textContent = "从这组里留下唯一一首";
    els.choiceTitle.textContent = "哪一首值得先登岛？";
    els.choiceGrid.className = "choice-grid four-up";
    els.choiceGrid.innerHTML = group.map(choiceCard).join("");
    els.unfamiliarAction.hidden = false;
    els.matchNote.hidden = false;
    showView("battle");
  }

  function chooseLanding(winnerId) {
    const group = state.groups[state.groupIndex];
    if (winnerId) state.groupWinners.push(winnerId);
    group.forEach((id) => { if (id !== winnerId) state.eliminated.push(id); });
    state.groupIndex += 1;
    if (state.groupIndex < state.groups.length) {
      save();
      renderLanding();
      return;
    }
    const landing = [state.directSeed, ...state.groupWinners];
    state.revivalSlots = 20 - landing.length;
    state.selection = [];
    state.selectionMode = "revival";
    state.phase = "revival";
    save();
    renderSelection();
  }

  function renderDuel() {
    const pair = state.duelPairs[state.duelIndex].map(byId);
    const isFinal = state.phase === "final";
    const isTop20 = state.phase === "duel20";
    els.stageEnglish.textContent = isFinal ? "ISLAND OWNER FINAL" : (isTop20 ? "TIDAL DUEL" : "INNER ISLAND DUEL");
    els.stageTitle.textContent = isFinal ? "岛主决选 · 二选一" : (isTop20 ? "二十进十 · 二选一" : "十进五 · 二选一");
    els.stageCounter.textContent = `${state.duelIndex + 1} / ${state.duelPairs.length}`;
    els.roundProgress.style.width = `${(state.duelIndex / state.duelPairs.length) * 100}%`;
    els.choiceHint.textContent = isFinal ? "最后一次，只听自己的偏爱" : "这一轮不再设跳过";
    els.choiceTitle.textContent = isFinal ? "谁来成为蛋岛岛主？" : "这一组，谁继续向岛心前进？";
    els.choiceGrid.className = "choice-grid duel";
    els.choiceGrid.innerHTML = pair.map(choiceCard).join("");
    els.unfamiliarAction.hidden = true;
    els.matchNote.hidden = true;
    showView("battle");
  }

  function chooseDuel(winnerId) {
    state.duelWinners.push(winnerId);
    state.duelIndex += 1;
    if (state.duelIndex < state.duelPairs.length) {
      save();
      renderDuel();
      return;
    }
    if (state.phase === "duel20") {
      state.top10 = [...state.duelWinners];
      state.duelPairs = makeDuelPairs(state.top10);
      state.duelIndex = 0;
      state.duelWinners = [];
      setCheckpoint("十座内岛已经升起", "接下来十进五，选择会变得更难。", "duel10");
    } else if (state.phase === "duel10") {
      state.top5 = [...state.duelWinners];
      state.selection = [];
      state.selectionMode = "council";
      setCheckpoint("五首歌抵达岛心", "下一站是岛主议会：五选二。", "council");
    } else {
      state.champion = winnerId;
      state.phase = "complete";
      state.completedAt = new Date().toISOString();
      state.checkpoint = null;
      save();
      renderResult();
      return;
    }
    save();
    renderCheckpoint();
  }

  function selectionCandidates() {
    return state.selectionMode === "revival" ? state.eliminated.map(byId) : state.top5.map(byId);
  }

  function selectionLimit() {
    return state.selectionMode === "revival" ? state.revivalSlots : 2;
  }

  function renderSelection() {
    const revival = state.selectionMode === "revival";
    const limit = selectionLimit();
    $("#selectionEyebrow").textContent = revival ? "TIDAL REVIVAL" : "ISLAND COUNCIL";
    $("#selectionTitle").textContent = revival ? "潮水送回一些遗珠" : "五强进入岛主议会";
    $("#selectionCopy").innerHTML = revival
      ? `从离岛歌曲中选回 <b id="selectionNeed">${limit}</b> 首，凑齐二十强。`
      : `从五强中同时选出 <b id="selectionNeed">2</b> 首，进入最终决选。`;
    els.selectionNeed = $("#selectionNeed");
    els.selectionCount.textContent = `${state.selection.length} / ${limit}`;
    els.confirmSelection.disabled = state.selection.length !== limit;
    els.selectionGrid.innerHTML = selectionCandidates().map((song) => `
      <button class="select-card ${state.selection.includes(song.id) ? "selected" : ""}" type="button" data-select-id="${song.id}">
        ${imageMarkup(song)}<div><b>${song.title}</b><small>${song.release}</small></div>
      </button>`).join("");
    showView("selection");
  }

  function toggleSelection(id) {
    const limit = selectionLimit();
    const index = state.selection.indexOf(id);
    if (index >= 0) state.selection.splice(index, 1);
    else if (state.selection.length < limit) state.selection.push(id);
    else return showToast(`这一站只能选择 ${limit} 首`);
    save();
    renderSelection();
  }

  function confirmSelection() {
    if (state.selection.length !== selectionLimit()) return;
    if (state.selectionMode === "revival") {
      state.top20 = [state.directSeed, ...state.groupWinners, ...state.selection];
      state.duelPairs = makeDuelPairs(state.top20);
      state.duelIndex = 0;
      state.duelWinners = [];
      setCheckpoint("二十座音乐岛已经亮起", "离开海选区，下一站开始双歌对决。", "duel20");
    } else {
      state.finalists = [...state.selection];
      state.duelPairs = [[...state.finalists]];
      state.duelIndex = 0;
      state.duelWinners = [];
      setCheckpoint("两首歌来到最终海岸", "最后一次二选一，决定你的蛋岛岛主。", "final");
    }
    state.selection = [];
    save();
    renderCheckpoint();
  }

  function setCheckpoint(title, copy, nextPhase) {
    state.phase = "checkpoint";
    state.checkpoint = { title, copy, nextPhase };
  }

  function routeData() {
    return [
      [state.directSeed, ...state.groupWinners],
      state.top20,
      state.top10,
      state.top5,
      state.finalists,
      state.champion ? [state.champion] : []
    ];
  }

  function renderRoute(container) {
    const data = routeData();
    container.innerHTML = data.map((ids, stageIndex) => {
      const padded = [...ids, ...Array(Math.max(0, STAGE_COUNTS[stageIndex] - ids.length)).fill(null)];
      return `<div class="route-stage"><div class="route-head">${STAGE_LABELS[stageIndex]}</div>${padded.map((id) => `<div class="route-entry ${id ? "" : "pending"}"><span>${id ? byId(id).title : "·"}</span></div>`).join("")}</div>`;
    }).join("");
  }

  function renderCheckpoint() {
    $("#checkpointTitle").textContent = state.checkpoint.title;
    $("#checkpointCopy").textContent = state.checkpoint.copy;
    renderRoute(els.checkpointRoute);
    showView("checkpoint");
  }

  function continueStage() {
    state.phase = state.checkpoint.nextPhase;
    state.checkpoint = null;
    save();
    renderCurrent();
  }

  function renderResult() {
    const winner = byId(state.champion);
    $("#winnerCover").src = winner.cover;
    $("#winnerCover").onerror = () => { $("#winnerCover").src = FALLBACK_COVER; };
    $("#winnerTitle").textContent = winner.title;
    $("#winnerSource").textContent = winner.release;
    renderRoute(els.finalRoute);
    showView("result");
    updateContinue();
  }

  function renderCurrent() {
    if (!state) return showView("home");
    if (state.phase === "landing") renderLanding();
    else if (["duel20", "duel10", "final"].includes(state.phase)) renderDuel();
    else if (["revival", "council"].includes(state.phase)) renderSelection();
    else if (state.phase === "checkpoint") renderCheckpoint();
    else if (state.phase === "complete") renderResult();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function fitText(ctx, text, width) {
    if (ctx.measureText(text).width <= width) return text;
    let value = text;
    while (value.length && ctx.measureText(`${value}…`).width > width) value = value.slice(0, -1);
    return `${value}…`;
  }

  function loadImage(source) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => {
        if (source === FALLBACK_COVER) resolve(null);
        else resolve(loadImage(FALLBACK_COVER));
      };
      image.src = source;
    });
  }

  async function drawPoster() {
    const canvas = els.canvas;
    const ctx = canvas.getContext("2d");
    const W = 1200;
    const H = 2000;
    canvas.width = W;
    canvas.height = H;
    const winner = byId(state.champion);
    const [island, cover] = await Promise.all([loadImage("assets/island.svg"), loadImage(winner.cover)]);

    const background = ctx.createLinearGradient(0, 0, W, H);
    background.addColorStop(0, "#f8fcef");
    background.addColorStop(.55, "#eef6df");
    background.addColorStop(1, "#eeeafb");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#466f45";
    ctx.font = "900 21px Arial";
    ctx.fillText("PURE ISLAND · DAN ISLAND", 60, 70);
    ctx.fillStyle = "#708074";
    ctx.font = "18px 'Microsoft YaHei'";
    ctx.fillText("六段音乐巡游 / 我的唯一岛主", 60, 105);

    const hero = ctx.createLinearGradient(60, 150, 1140, 570);
    hero.addColorStop(0, "#284332");
    hero.addColorStop(.6, "#557c45");
    hero.addColorStop(1, "#665394");
    roundRect(ctx, 60, 145, 1080, 450, 42);
    ctx.fillStyle = hero;
    ctx.fill();
    if (island) {
      ctx.save(); ctx.globalAlpha = .22; ctx.drawImage(island, 680, 150, 500, 430); ctx.restore();
    }
    ctx.fillStyle = "#f4ef99";
    ctx.font = "900 17px Arial";
    ctx.fillText("OWNER OF DAN ISLAND", 115, 220);
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = "22px 'Microsoft YaHei'";
    ctx.fillText("我的蛋岛岛主是", 115, 270);
    ctx.fillStyle = "#fff";
    ctx.font = "900 62px 'Microsoft YaHei'";
    ctx.fillText(fitText(ctx, winner.title, 600), 115, 365);
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = "20px 'Microsoft YaHei'";
    ctx.fillText(fitText(ctx, winner.release, 600), 118, 415);
    if (cover) {
      ctx.save();
      roundRect(ctx, 850, 210, 220, 220, 35);
      ctx.clip();
      ctx.drawImage(cover, 850, 210, 220, 220);
      ctx.restore();
    }

    ctx.fillStyle = "#284332";
    ctx.font = "900 30px 'Microsoft YaHei'";
    ctx.fillText("完整六段巡游图", 60, 670);
    ctx.fillStyle = "#708074";
    ctx.font = "17px 'Microsoft YaHei'";
    ctx.fillText("从四选一登岛，到最后一首歌成为岛主。", 315, 669);

    const data = routeData();
    const boardX = 60;
    const boardY = 720;
    const boardW = 1080;
    const boardH = 1110;
    const colW = boardW / 6;
    const headerH = 48;
    const colors = ["#e4f4b8", "#cceec0", "#bfe5d5", "#d6d0f4", "#f0d4ec", "#f4ef99"];
    data.forEach((ids, stageIndex) => {
      const x = boardX + stageIndex * colW;
      ctx.fillStyle = colors[stageIndex];
      ctx.fillRect(x, boardY, colW, headerH);
      ctx.strokeStyle = "rgba(45,67,49,.26)";
      ctx.strokeRect(x, boardY, colW, headerH);
      ctx.fillStyle = "#213025";
      ctx.textAlign = "center";
      ctx.font = "900 15px 'Microsoft YaHei'";
      ctx.fillText(STAGE_LABELS[stageIndex], x + colW / 2, boardY + 31);
      const rowH = (boardH - headerH) / STAGE_COUNTS[stageIndex];
      const padded = [...ids, ...Array(Math.max(0, STAGE_COUNTS[stageIndex] - ids.length)).fill(null)];
      padded.forEach((id, rowIndex) => {
        const y = boardY + headerH + rowIndex * rowH;
        ctx.fillStyle = id ? "rgba(255,255,255,.82)" : "rgba(255,255,255,.35)";
        ctx.fillRect(x, y, colW, rowH);
        ctx.strokeStyle = "rgba(45,67,49,.16)";
        ctx.strokeRect(x, y, colW, rowH);
        if (id) {
          const size = [11, 11, 15, 20, 27, 35][stageIndex];
          ctx.fillStyle = "#213025";
          ctx.font = `800 ${size}px 'Microsoft YaHei'`;
          ctx.fillText(fitText(ctx, byId(id).title, colW - 12), x + colW / 2, y + rowH / 2 + size * .35);
        }
      });
    });
    ctx.textAlign = "left";
    ctx.fillStyle = "#708074";
    ctx.font = "16px 'Microsoft YaHei'";
    ctx.fillText("选择只保存在本机 · PURE ISLAND", 60, 1925);
    ctx.textAlign = "right";
    ctx.fillStyle = "#466f45";
    ctx.font = "900 18px Arial";
    ctx.fillText(new Date().toLocaleDateString("zh-CN"), 1140, 1925);
    ctx.textAlign = "left";
    posterBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", .95));
  }

  async function openPoster() {
    await drawPoster();
    els.posterDialog.showModal();
  }

  function downloadPoster() {
    if (!posterBlob) return;
    const url = URL.createObjectURL(posterBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PURE-ISLAND-${byId(state.champion).title}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function sharePoster() {
    if (!posterBlob) return;
    const winner = byId(state.champion);
    const file = new File([posterBlob], `PURE-ISLAND-${winner.title}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: "我的蛋岛岛主", text: `我的蛋岛岛主是《${winner.title}》`, files: [file] }); }
      catch (error) { if (error.name !== "AbortError") showToast("分享没有完成，可以先保存图片"); }
    } else {
      downloadPoster();
      showToast("当前浏览器不支持直接分享，已保存图片");
    }
  }

  function bindEvents() {
    $$('[data-home]').forEach((button) => button.addEventListener("click", () => showView("home")));
    $("#startJourney").addEventListener("click", startJourney);
    els.continueJourney.addEventListener("click", () => { state = load(); renderCurrent(); });
    $("#pauseJourney").addEventListener("click", () => { save(); updateContinue(); showView("home"); });
    els.choiceGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-song-id]");
      if (!button) return;
      if (state.phase === "landing") chooseLanding(button.dataset.songId);
      else chooseDuel(button.dataset.songId);
    });
    els.unfamiliarAction.addEventListener("click", () => chooseLanding(null));
    els.selectionGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-select-id]");
      if (button) toggleSelection(button.dataset.selectId);
    });
    els.confirmSelection.addEventListener("click", confirmSelection);
    $("#continueStage").addEventListener("click", continueStage);
    $("#restartJourney").addEventListener("click", () => { clear(); startJourney(); });
    $("#makePoster").addEventListener("click", openPoster);
    $("#downloadPoster").addEventListener("click", downloadPoster);
    $("#sharePoster").addEventListener("click", sharePoster);
    $("#openAbout").addEventListener("click", () => els.aboutDialog.showModal());
    $$('[data-close-about]').forEach((button) => button.addEventListener("click", () => els.aboutDialog.close()));
    $$('[data-close-poster]').forEach((button) => button.addEventListener("click", () => els.posterDialog.close()));
  }

  function init() {
    bindEvents();
    updateContinue();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  init();
})();
