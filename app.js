(() => {
  "use strict";

  const songs = window.SONG_CATALOG || [];
  const STORAGE_KEY = "dan-island-odyssey-v15";
  const LEGACY_STORAGE_KEYS = ["dan-island-odyssey-v14", "dan-island-odyssey-v13", "dan-island-odyssey-v12", "dan-island-odyssey-v11", "dan-island-odyssey-v10", "dan-island-odyssey-v9"];
  const FALLBACK_COVER = "assets/cover-fallback.svg";
  const JOURNEY_URL = "https://umikaze07kari.github.io/SYC128";
  const DEVICE_KEY = "dan-island-anonymous-device-v1";
  const API_BASE_URL = String(window.DAN_ISLAND_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  const LANDING_GROUP_SIZE = 4;
  const BRACKET_SIZES = [16, 32, 64];
  const BOARD_OPTIONS = [
    { key: "original", number: "01", title: "个人作品榜", description: "专辑曲＋个人单曲", match: (song) => song.source === "album" || song.source === "single" },
    { key: "ost", number: "02", title: "OST 榜", description: "影视／游戏／节目原声", match: (song) => song.source === "ost" },
    { key: "stage", number: "03", title: "现场翻唱榜", description: "音综／晚会／演唱会", match: (song) => ["live", "variety", "other"].includes(song.source) }
  ];
  const DEFAULT_BOARDS = BOARD_OPTIONS.map((board) => board.key);
  const boardForSong = (song) => BOARD_OPTIONS.find((board) => board.match(song))?.key || "stage";
  const STAGE_COLLECTIONS = [
    { key: "voice2020", group: "classic", label: "2020中国好声音", release: "综艺《2020中国好声音》" },
    { key: "burstStage", group: "classic", label: "爆裂舞台", release: "综艺《爆裂舞台》" },
    { key: "infinitySound", group: "classic", label: "声生不息", releases: ["综艺《声生不息·港乐季》", "综艺《声生不息·大湾区季》", "综艺《声生不息·家年华》"] },
    { key: "dramaSongs", group: "classic", label: "剧好听的歌", release: "综艺《剧好听的歌》" },
    { key: "singer2025", group: "classic", label: "歌手2025", release: "综艺《歌手2025》" },
    { key: "giftedVoice", group: "other", label: "天赐的声音", release: "综艺《天赐的声音》" },
    { key: "praiseSong", group: "other", label: "为歌而赞", release: "综艺《为歌而赞》" },
    { key: "rapListen", group: "other", label: "说唱听我的", release: "综艺《说唱听我的》" },
    { key: "ourSong", group: "other", label: "我们的歌", release: "综艺《我们的歌》" },
    { key: "musicPlan", group: "other", label: "音乐缘计划", release: "综艺《音乐缘计划》" },
    { key: "chinaMusic", group: "other", label: "国乐无双", release: "综艺《国乐无双》" },
    { key: "gala", group: "gala", label: "晚会舞台", release: "晚会舞台" },
    { key: "concert", group: "concert", label: "演唱会翻唱", release: "演唱会" }
  ];
  const STAGE_GROUPS = [
    { key: "classic", title: "经典音综" },
    { key: "other", title: "其他音综" },
    { key: "gala", title: "晚会" },
    { key: "concert", title: "演唱会翻唱" }
  ];
  const DEFAULT_STAGE_COLLECTIONS = STAGE_COLLECTIONS.map((item) => item.key);
  const stageCollectionReleases = (item) => item.releases || [item.release];
  const ROUND_LABELS = {
    duel64: "六十四进三十二",
    duel32: "三十二进十六",
    duel16: "十六进八",
    duel8: "八进四",
    duel4: "四进二",
    duel8Revival: "八强复活挑战",
    final: "挚爱决选"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = (id) => songs.find((song) => song.id === id);

  const els = {
    views: $$(".view"),
    continueJourney: $("#continueJourney"),
    collectionToggles: $("#collectionToggles"),
    selectedSongCount: $("#selectedSongCount"),
    startJourney: $("#startJourney"),
    stageDetailPanel: $("#stageDetailPanel"),
    stageDetailContent: $("#stageDetailContent"),
    toggleStageDetails: $("#toggleStageDetails"),
    stageEnglish: $("#stageEnglish"),
    stageTitle: $("#stageTitle"),
    stageCounter: $("#stageCounter"),
    roundProgress: $("#roundProgress"),
    choiceHint: $("#choiceHint"),
    choiceTitle: $("#choiceTitle"),
    choiceGrid: $("#choiceGrid"),
    unfamiliarAction: $("#unfamiliarAction"),
    undoChoice: $("#undoChoice"),
    matchNote: $("#matchNote"),
    selectionGrid: $("#selectionGrid"),
    selectionCount: $("#selectionCount"),
    selectionNeed: $("#selectionNeed"),
    confirmSelection: $("#confirmSelection"),
    checkpointSky: $("#checkpointSky"),
    checkpointBubbles: $("#checkpointBubbles"),
    checkpointUndo: $("#checkpointUndo"),
    finalRoute: $("#finalRoute"),
    aboutDialog: $("#aboutDialog"),
    posterDialog: $("#posterDialog"),
    canvas: $("#resultCanvas"),
    posterImage: $("#resultPosterImage"),
    posterSaveHint: $("#posterSaveHint"),
    resultQr: $("#resultQr"),
    submissionStatus: $("#submissionStatus"),
    retrySubmission: $("#retrySubmission"),
    toast: $("#toast")
  };

  let state = null;
  let posterBlob = null;
  let toastTimer = null;
  let audio = null;
  const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
  const preloadedCovers = new Set();

  function showToast(message) {
    $("#toast").textContent = message;
    $("#toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2100);
  }

  function showView(name) {
    els.views.forEach((view) => view.classList.toggle("active", view.id === `${name}View`));
    document.body.dataset.view = name;
    window.scrollTo(0, 0);
  }

  function anonymousDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function journeyId() {
    return globalThis.crypto?.randomUUID?.() || `journey-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
    const aCore = a.source === "album" || a.source === "single";
    const bCore = b.source === "album" || b.source === "single";
    const sameProgram = a.release === b.release;
    if (sameProgram) score += 36;
    if (a.source === "ost" && b.source === "ost") score += 24;
    if (a.source === "variety" && b.source === "variety") score += 8;
    if (!aCore && !bCore && a.source === b.source) score += 6;
    if (aCore && bCore) score -= 28;
    if (a.vocal === b.vocal) score += 1;
    if (a.mood === b.mood) score += 2;
    score -= Math.abs(a.seedScore - b.seedScore) * .01;
    return score;
  }

  function effectiveSeed(song) {
    return song.seedScore + (song.source === "album" ? 8 : 0);
  }

  function landingPlacementCost(group, candidate) {
    const members = group.map(byId);
    const sameSource = members.filter((song) => song.source === candidate.source).length;
    const sameRelease = members.filter((song) => song.release === candidate.release).length;
    const sameMood = members.filter((song) => song.mood === candidate.mood).length;
    const groupPower = members.reduce((sum, song) => sum + effectiveSeed(song), 0);
    const albumCollision = candidate.source === "album" && sameSource ? 800 : 0;
    return albumCollision + sameRelease * 420 + sameSource * 90 - sameMood * 4 + groupPower * .08 + Math.random();
  }

  function bracketSizeFor(poolSize) {
    if (poolSize > 96) return 64;
    if (poolSize > 48) return 32;
    return 16;
  }

  function revivalLimitFor(target) {
    return target === 64 ? 8 : target === 32 ? 5 : 3;
  }

  function makeLandingGroups(pool, target = bracketSizeFor(pool.length)) {
    const revivalLimit = revivalLimitFor(target);
    const baseQualifiers = target - revivalLimit - Math.ceil(revivalLimit / 2);
    const ranked = [...pool].sort((a, b) => effectiveSeed(b) - effectiveSeed(a));
    let directCount = 0;
    while (directCount < Math.min(target, pool.length)
      && directCount + Math.ceil((pool.length - directCount) / LANDING_GROUP_SIZE) < baseQualifiers) directCount += 1;
    const directSeeds = ranked.splice(0, directCount);
    const groupCount = Math.ceil(ranked.length / LANDING_GROUP_SIZE);
    const seeds = ranked.splice(0, groupCount);
    const groups = seeds.map((seed) => [seed.id]);
    const remaining = [...ranked].sort((a, b) => effectiveSeed(b) - effectiveSeed(a));

    while (remaining.length) {
      const batch = remaining.splice(0, groups.length);
      const sourceFrequency = batch.reduce((counts, song) => ({ ...counts, [song.source]: (counts[song.source] || 0) + 1 }), {});
      batch.sort((a, b) => {
        const albumPriority = Number(b.source === "album") - Number(a.source === "album");
        return albumPriority || sourceFrequency[b.source] - sourceFrequency[a.source] || effectiveSeed(b) - effectiveSeed(a);
      });
      const available = [...groups];
      batch.forEach((candidate) => {
        available.sort((a, b) => landingPlacementCost(a, candidate) - landingPlacementCost(b, candidate));
        available.shift().push(candidate.id);
      });
    }

    return { directSeeds: directSeeds.map((song) => song.id), groups: shuffled(groups).map((group) => shuffled(group)) };
  }

  function firstStageTargetFor(poolSize) { return bracketSizeFor(poolSize); }

  function estimateJourney(count) {
    if (count < 16) return "暂不足 16 首";
    const target = bracketSizeFor(count);
    const revivalLimit = revivalLimitFor(target);
    const baseQualifiers = target - revivalLimit - Math.ceil(revivalLimit / 2);
    let directCount = 0;
    while (directCount < Math.min(target, count)
      && directCount + Math.ceil((count - directCount) / LANDING_GROUP_SIZE) < baseQualifiers) directCount += 1;
    const initialGroups = Math.ceil((count - directCount) / LANDING_GROUP_SIZE);
    const minimumLanding = target - revivalLimit;
    const supplementGroups = Math.max(0, minimumLanding - directCount - initialGroups);
    const choices = initialGroups + supplementGroups + revivalLimit + target - 1 + 2;
    const minutes = Math.max(3, Math.round(choices * 7 / 60));
    return `预计 ${Math.max(2, minutes - 2)}–${minutes + 2} 分钟`;
  }

  function readJourneyConfig() {
    return {
      includeCollabs: $('input[name="vocalScope"]:checked')?.value !== "solo",
      boards: $$('#collectionToggles input:checked').map((input) => input.value),
      stageCollections: $$('#stageDetailContent input[data-stage-collection]:checked').map((input) => input.value)
    };
  }

  function songsForConfig(config) {
    const enabled = new Set(config.boards || []);
    const selectedStageKeys = new Set(config.stageCollections || []);
    if (["infinityHK", "infinityBay", "infinityFamily"].some((key) => selectedStageKeys.has(key))) selectedStageKeys.add("infinitySound");
    const stageReleases = new Set(STAGE_COLLECTIONS.filter((item) => selectedStageKeys.has(item.key)).flatMap(stageCollectionReleases));
    return songs.filter((song) => {
      const board = boardForSong(song);
      if (!enabled.has(board) || (!config.includeCollabs && song.vocal === "collab")) return false;
      return board !== "stage" || stageReleases.has(song.release);
    });
  }

  function songsForBoard(boardKey, config) {
    return songsForConfig({ ...config, boards: [boardKey] });
  }

  function renderStageDetails(config = null) {
    const enabled = new Set(config?.stageCollections || DEFAULT_STAGE_COLLECTIONS);
    if (["infinityHK", "infinityBay", "infinityFamily"].some((key) => enabled.has(key))) enabled.add("infinitySound");
    els.stageDetailContent.innerHTML = STAGE_GROUPS.map((group) => {
      const items = STAGE_COLLECTIONS.filter((item) => item.group === group.key);
      return `<section class="stage-detail-group">
        <div class="stage-detail-group-head"><b>${group.title}</b><button type="button" data-toggle-stage-group="${group.key}">全选／取消</button></div>
        <div class="stage-detail-options">${items.map((item) => {
          const releases = new Set(stageCollectionReleases(item));
          const count = songs.filter((song) => releases.has(song.release)).length;
          return `<label><input type="checkbox" data-stage-collection value="${item.key}" ${enabled.has(item.key) ? "checked" : ""}><span>${item.label}<small>${count} 首</small></span></label>`;
        }).join("")}</div>
      </section>`;
    }).join("");
  }

  function renderJourneyConfig(config = null) {
    const enabled = new Set(config?.boards || DEFAULT_BOARDS);
    els.collectionToggles.innerHTML = BOARD_OPTIONS.map((board) => {
      return `<label class="board-switch board-${board.key}">
        <input type="checkbox" value="${board.key}" ${enabled.has(board.key) ? "checked" : ""}>
        <span class="board-check" aria-hidden="true"></span>
        <span class="board-copy"><small>${board.number} / <i data-board-count="${board.key}">0 首</i></small><b>${board.title}</b><em>${board.description}</em><strong data-board-time="${board.key}">计算中…</strong></span>
      </label>`;
    }).join("");
    renderStageDetails(config);
    const vocal = config?.includeCollabs === false ? "solo" : "all";
    $(`input[name="vocalScope"][value="${vocal}"]`).checked = true;
    updateSelectedCount();
  }

  function updateSelectedCount() {
    const config = readJourneyConfig();
    const count = songsForConfig(config).length;
    els.selectedSongCount.textContent = `${count} 首 · ${estimateJourney(count)}`;
    BOARD_OPTIONS.forEach((board) => {
      const boardCount = songsForBoard(board.key, config).length;
      $(`[data-board-count="${board.key}"]`).textContent = `${boardCount} 首`;
      $(`[data-board-time="${board.key}"]`).textContent = estimateJourney(boardCount);
    });
    const stageEnabled = config.boards.includes("stage");
    els.stageDetailPanel.hidden = !stageEnabled;
    const canStart = config.boards.length > 0;
    els.startJourney.disabled = !canStart;
    els.startJourney.title = canStart ? "" : "请至少选择一个板块";
  }

  function firstRoundSpeed(id) {
    const value = state?.landingChoiceMs?.[id];
    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  }

  function orderPairByFirstRoundSpeed(pair) {
    return [...pair].sort((left, right) => firstRoundSpeed(left) - firstRoundSpeed(right));
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
      // 首轮用时只控制同一对阵中的上下位置，不参与配对。
      return orderPairByFirstRoundSpeed([seed.id, opponent.id]);
    });
  }

  function freshState(pool, config) {
    const firstStageTarget = firstStageTargetFor(pool.length);
    const { directSeeds, groups } = makeLandingGroups(pool, firstStageTarget);
    return {
      version: 15,
      journeyId: journeyId(),
      createdAt: new Date().toISOString(),
      catalogIds: pool.map((song) => song.id),
      config,
      firstStageTarget,
      phase: "landing",
      directSeeds,
      groups,
      initialGroupCount: groups.length,
      supplementScheduled: false,
      groupIndex: 0,
      groupWinners: [],
      landingTiebreak: [],
      landingChoiceMs: {},
      landingGroupStartedAt: null,
      eliminated: [],
      duelPairs: [],
      duelIndex: 0,
      duelWinners: [],
      bracketRounds: [],
      selection: [],
      selectionMode: null,
      revivalSlots: 0,
      top8RevivalCandidates: [],
      revivalChallenger: null,
      revivalDefender: null,
      top64: [],
      top32: [],
      top16: [],
      top8: [],
      top4: [],
      top2: [],
      finalists: [],
      champion: null,
      auditEvents: [],
      stepStartedAt: null,
      submission: null,
      checkpoint: null,
      history: []
    };
  }

  function save() {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
      const saved = JSON.parse(raw);
      if (saved?.version === 15) return saved;
      return null;
    } catch {
      return null;
    }
  }

  function clear() {
    state = null;
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    updateContinue();
  }

  function updateContinue() {
    const saved = load();
    els.continueJourney.hidden = !saved;
    if (saved) els.continueJourney.textContent = saved.phase === "complete" ? "查看上次 Top 1" : "继续上次环游";
  }

  function imageMarkup(song, className = "") {
    return `<img class="${className}" src="${song.cover}" alt="《${song.title}》封面" loading="eager" decoding="async" onerror="this.onerror=null;this.src='${FALLBACK_COVER}'">`;
  }

  function preloadCovers(ids) {
    if (navigator.connection?.saveData) return;
    [...new Set(ids)].map(byId).filter(Boolean).forEach((song) => {
      if (preloadedCovers.has(song.cover)) return;
      preloadedCovers.add(song.cover);
      const image = new Image();
      image.decoding = "async";
      image.src = song.cover;
    });
  }

  function preloadUpcomingChoices() {
    const schedule = window.requestIdleCallback || ((callback) => setTimeout(callback, 80));
    schedule(() => {
      if (["landing", "landingTiebreak"].includes(state?.phase)) {
        const upcoming = (state.groups || []).slice(state.groupIndex + 1, state.groupIndex + 4).flat();
        preloadCovers(upcoming);
      } else if (state?.duelPairs) {
        const upcoming = state.duelPairs.slice(state.duelIndex + 1, state.duelIndex + 5).flat();
        preloadCovers(upcoming);
      }
    });
  }

  function shortLine(song) {
    return song.lyricExcerpt || "";
  }

  function lyricMarkup(lyric) {
    const escaped = lyric
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    // Both a real line break and a literal `\\n` in imported data can be used
    // to choose the line break position of a highlight lyric.
    return escaped.replace(/\\n|\r?\n/g, "<br>");
  }

  function choiceCard(song, cardIndex = 0) {
    const lyric = shortLine(song);
    const charmKinds = ["note", "heart", "bubble", "flora"];
    const charmKind = charmKinds[cardIndex % charmKinds.length];
    return `
      <button class="cover-choice source-${song.source}${lyric ? "" : " no-lyric"}" type="button" data-song-id="${song.id}">
        <div class="cover-frame">${imageMarkup(song)}</div>
        <div class="choice-info">
          <span class="card-charms charm-${charmKind}" aria-hidden="true"><i></i><i></i><i></i></span>
          <h3><span>${song.title}</span></h3>
          <small>${song.release}</small>
          ${lyric ? `<div class="mini-lyric">${lyricMarkup(lyric)}</div>` : ""}
        </div>
      </button>`;
  }

  function startJourney() {
    const config = readJourneyConfig();
    const pool = songsForConfig(config);
    if (!config.boards.length) return showToast("请至少选择一个喜欢的板块");
    if (pool.length < 16) return showToast("当前范围不足 16 首，请增加一些感兴趣的内容");
    state = freshState(pool, config);
    save();
    renderCurrent();
  }

  function beginAuditStep() {
    if (!Number.isFinite(state.stepStartedAt)) {
      state.stepStartedAt = Date.now();
      save();
    }
  }

  function recordDecision(kind, candidates, selected) {
    state.auditEvents ||= [];
    const now = Date.now();
    const journeyStart = Date.parse(state.createdAt) || now;
    state.auditEvents.push({
      kind,
      phase: state.phase,
      candidates: [...candidates],
      selected: Array.isArray(selected) ? [...selected] : selected,
      elapsedMs: Math.max(0, now - (state.stepStartedAt || now)),
      journeyElapsedMs: Math.max(0, now - journeyStart)
    });
    state.stepStartedAt = null;
  }

  function pushHistory() {
    const { history, ...snapshot } = state;
    state.history.push(JSON.parse(JSON.stringify(snapshot)));
    if (state.history.length > 12) state.history.shift();
  }

  function undoLastChoice() {
    if (!state?.history?.length) return;
    const history = [...state.history];
    const previous = history.pop();
    state = { ...previous, history };
    save();
    renderCurrent();
    showToast("已撤回刚才的选择");
  }

  function updateUndo() {
    els.undoChoice.disabled = !state?.history?.length;
  }

  function renderLanding() {
    const tiebreak = state.phase === "landingTiebreak";
    const supplement = !tiebreak && state.supplementScheduled && state.groupIndex >= state.initialGroupCount;
    const ids = tiebreak ? state.landingTiebreak : state.groups[state.groupIndex];
    const group = ids.map(byId);
    els.stageEnglish.textContent = tiebreak ? `TOP ${state.firstStageTarget} PLAY-IN` : supplement ? "SECOND CHANCE PLAY-IN" : "LANDING ROUND";
    els.stageTitle.textContent = tiebreak ? `${state.firstStageTarget} 强加赛 · ${ids.length}选一` : supplement ? `遗珠加赛 · ${ids.length}选一` : `登岛海选 · ${ids.length}选一`;
    els.stageCounter.textContent = tiebreak ? "最后一组" : `${state.groupIndex + 1} / ${state.groups.length}`;
    els.roundProgress.style.width = tiebreak ? "100%" : `${(state.groupIndex / state.groups.length) * 100}%`;
    els.choiceHint.textContent = tiebreak ? `最后一个 ${state.firstStageTarget} 强席位` : supplement ? "用加赛减少需要手动送回的遗珠" : "从这组里留下唯一一首";
    els.choiceTitle.textContent = tiebreak ? "谁来拿到最后一张通行票？" : supplement ? "这一组，谁值得重新登岛？" : "哪一首值得先登岛？";
    els.choiceGrid.className = "choice-grid four-up";
    els.choiceGrid.innerHTML = group.map(choiceCard).join("");
    preloadUpcomingChoices();
    if (!Number.isFinite(state.landingGroupStartedAt)) {
      state.landingGroupStartedAt = Date.now();
      save();
    }
    beginAuditStep();
    els.unfamiliarAction.hidden = tiebreak || supplement;
    els.matchNote.hidden = false;
    updateUndo();
    showView("battle");
  }

  function chooseLanding(winnerId) {
    pushHistory();
    const group = state.groups[state.groupIndex];
    recordDecision("landing", group, winnerId);
    if (winnerId) {
      state.groupWinners.push(winnerId);
      state.landingChoiceMs[winnerId] = Math.max(0, Date.now() - (state.landingGroupStartedAt || Date.now()));
    }
    state.landingGroupStartedAt = null;
    group.forEach((id) => { if (id !== winnerId) state.eliminated.push(id); });
    state.groupIndex += 1;
    if (state.groupIndex < state.groups.length) {
      save();
      renderLanding();
      return;
    }
    const landing = [...state.directSeeds, ...state.groupWinners];
    const minimumLandingQualifiers = state.firstStageTarget - revivalLimitFor(state.firstStageTarget);
    if (landing.length < minimumLandingQualifiers && !state.supplementScheduled) {
      const slotCount = minimumLandingQualifiers - landing.length;
      const candidates = shuffled(state.eliminated).slice(0, slotCount * LANDING_GROUP_SIZE);
      const candidateSet = new Set(candidates);
      const supplementGroups = Array.from({ length: slotCount }, () => []);
      candidates.forEach((id, index) => supplementGroups[index % slotCount].push(id));
      state.eliminated = state.eliminated.filter((id) => !candidateSet.has(id));
      state.groups.push(...supplementGroups.filter((group) => group.length));
      state.supplementScheduled = true;
      save();
      renderLanding();
      return;
    }
    if (landing.length > state.firstStageTarget) {
      const playoffSize = landing.length - state.firstStageTarget + 1;
      state.landingTiebreak = shuffled(landing).slice(0, playoffSize);
      state.phase = "landingTiebreak";
      save();
      renderLanding();
      return;
    }
    state.revivalSlots = state.firstStageTarget - landing.length;
    state.selection = [];
    state.selectionMode = "revival";
    if (state.revivalSlots <= 0) {
      launchFirstDuel(landing);
      save();
      renderCheckpoint();
      return;
    }
    state.phase = "revival";
    save();
    renderSelection();
  }

  function chooseLandingTiebreak(winnerId) {
    pushHistory();
    const contenders = [...state.landingTiebreak];
    recordDecision("landing-tiebreak", contenders, winnerId);
    contenders.forEach((id) => { if (id !== winnerId) state.eliminated.push(id); });
    const qualified = [...state.directSeeds, ...state.groupWinners].filter((id) => !contenders.includes(id));
    qualified.push(winnerId);
    state.landingTiebreak = [];
    launchFirstDuel(qualified);
    save();
    renderCheckpoint();
  }

  function renderDuel() {
    const pair = state.duelPairs[state.duelIndex].map(byId);
    const isFinal = state.phase === "final";
    const stageMeta = {
      duel64: ["OPEN SEA DUEL", "六十四进三十二 · 二选一"],
      duel32: ["COASTLINE DUEL", "三十二进十六 · 二选一"],
      duel16: ["TIDAL DUEL", "十六进八 · 二选一"],
      duel8Revival: ["TOP 8 WILDCARD", "八强复活挑战 · 二选一"],
      duel8: ["INNER ISLAND DUEL", "八进四 · 二选一"],
      duel4: ["SUMMIT DUEL", "四进二 · 二选一"]
    };
    els.stageEnglish.textContent = isFinal ? "ISLAND OWNER FINAL" : stageMeta[state.phase][0];
    els.stageTitle.textContent = isFinal ? "挚爱决选 · 二选一" : stageMeta[state.phase][1];
    els.stageCounter.textContent = `${state.duelIndex + 1} / ${state.duelPairs.length}`;
    els.roundProgress.style.width = `${(state.duelIndex / state.duelPairs.length) * 100}%`;
    const revivalDuel = state.phase === "duel8Revival";
    els.choiceHint.textContent = isFinal ? "最后一次，只听自己的偏爱" : revivalDuel ? "胜者拿到最后一个八强席位" : "这一轮不再设跳过";
    els.choiceTitle.textContent = isFinal ? "哪一首是你心里的 Top 1？" : revivalDuel ? "复活遗珠，能否重返八强？" : "这一组，谁继续向岛心前进？";
    els.choiceGrid.className = isFinal ? "choice-grid duel final-duel" : "choice-grid duel";
    els.choiceGrid.innerHTML = `${choiceCard(pair[0], 0)}<span class="duel-versus" aria-hidden="true">VS</span>${choiceCard(pair[1], 1)}`;
    preloadUpcomingChoices();
    els.unfamiliarAction.hidden = true;
    els.matchNote.hidden = true;
    beginAuditStep();
    updateUndo();
    showView("battle");
  }

  function chooseDuel(winnerId) {
    pushHistory();
    recordDecision("duel", state.duelPairs[state.duelIndex], winnerId);
    state.duelWinners.push(winnerId);
    state.duelIndex += 1;
    if (state.duelIndex < state.duelPairs.length) {
      save();
      renderDuel();
      return;
    }
    if (state.phase === "duel8Revival") {
      state.bracketRounds.push({
        phase: state.phase,
        label: ROUND_LABELS[state.phase],
        matches: state.duelPairs.map((pair, index) => ({ songs: [...pair], winner: state.duelWinners[index] }))
      });
      if (winnerId === state.revivalChallenger) {
        state.top8 = state.top8.map((id) => id === state.revivalDefender ? winnerId : id);
      }
      state.duelPairs = makeDuelPairs(state.top8);
      state.duelIndex = 0;
      state.duelWinners = [];
      state.selection = [];
      setCheckpoint("接下来，八进四", winnerId === state.revivalChallenger ? "复活成功，新的八强阵容继续向岛心出发。" : "八强守擂成功，接下来继续向岛心出发。", "duel8", true);
      save();
      renderCheckpoint();
      return;
    }
    state.bracketRounds.push({
      phase: state.phase,
      label: ROUND_LABELS[state.phase],
      matches: state.duelPairs.map((pair, index) => ({ songs: [...pair], winner: state.duelWinners[index] }))
    });
    if (state.phase === "duel64") {
      state.top32 = [...state.duelWinners];
      state.duelPairs = makeDuelPairs(state.top32);
      state.duelIndex = 0;
      state.duelWinners = [];
      setCheckpoint("接下来，三十二进十六", "成功晋级的三十二首歌正在靠近海岸线。", "duel32", true);
    } else if (state.phase === "duel32") {
      state.top16 = [...state.duelWinners];
      state.duelPairs = makeDuelPairs(state.top16);
      state.duelIndex = 0;
      state.duelWinners = [];
      setCheckpoint("接下来，十六进八", "成功晋级的十六首歌正在浮向下一站。", "duel16", true);
    } else if (state.phase === "duel16") {
      state.top8 = [...state.duelWinners];
      const completedRound = state.bracketRounds[state.bracketRounds.length - 1];
      state.top8RevivalCandidates = completedRound.matches.map((match) => match.songs.find((id) => id !== match.winner)).filter(Boolean);
      state.duelIndex = 0;
      state.duelWinners = [];
      state.selection = [];
      state.selectionMode = "top8Revival";
      state.phase = "top8Revival";
    } else if (state.phase === "duel8") {
      state.top4 = [...state.duelWinners];
      state.duelPairs = makeDuelPairs(state.top4);
      state.duelIndex = 0;
      state.duelWinners = [];
      setCheckpoint("接下来，四进二", "四首歌已经抵达岛心，决赛席位即将揭晓。", "duel4", true);
    } else if (state.phase === "duel4") {
      state.top2 = [...state.duelWinners];
      state.finalists = [...state.top2];
      state.duelPairs = [[...state.top2]];
      state.duelIndex = 0;
      state.duelWinners = [];
      setCheckpoint("接下来，挚爱决选", "两首歌来到最终海岸，最后一次只听自己的偏爱。", "final", true);
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
    if (state.phase === "top8Revival") renderSelection();
    else renderCheckpoint();
  }

  function selectionCandidates() {
    const ids = state.selectionMode === "top8Revival" ? state.top8RevivalCandidates : state.eliminated;
    return ids.map(byId).filter(Boolean);
  }

  function selectionLimit() {
    return state.selectionMode === "top8Revival" ? 1 : Math.min(revivalLimitFor(state.firstStageTarget), state.revivalSlots);
  }

  function groupedSelectionCandidates() {
    const sourceOrder = ["album", "single", "ost", "variety", "live", "other"];
    const grouped = selectionCandidates().reduce((result, song) => {
      (result[song.source] ||= []).push(song);
      return result;
    }, {});
    return sourceOrder
      .filter((source) => grouped[source]?.length)
      .map((source) => ({ source, label: grouped[source][0].sourceLabel, songs: grouped[source] }));
  }

  function renderSelection() {
    const limit = selectionLimit();
    const top8Revival = state.selectionMode === "top8Revival";
    $("#selectionEyebrow").textContent = top8Revival ? "TOP 8 WILDCARD" : "TIDAL REVIVAL";
    $("#selectionTitle").textContent = top8Revival ? "八强复活名额" : "潮水送回一些遗珠";
    $("#selectionCopy").innerHTML = top8Revival
      ? `从刚刚惜败的歌里选择 <b id="selectionNeed">1</b> 首，向八强发起一次复活挑战。`
      : `从离岛歌曲中选回 <b id="selectionNeed">${limit}</b> 首，补足 ${state.firstStageTarget} 强。`;
    els.selectionNeed = $("#selectionNeed");
    els.selectionCount.textContent = `${state.selection.length} / ${limit}`;
    els.confirmSelection.disabled = state.selection.length !== limit;
    els.selectionGrid.className = "selection-groups";
    els.selectionGrid.innerHTML = groupedSelectionCandidates().map((group) => `
      <section class="selection-group source-${group.source}">
        <div class="selection-group-head"><b>${group.label}</b><span>${group.songs.length} 首</span></div>
        <div class="selection-group-grid">
          ${group.songs.map((song) => `
            <button class="select-card compact source-${song.source} ${state.selection.includes(song.id) ? "selected" : ""}" type="button" data-select-id="${song.id}" title="${song.title}">
              <span aria-hidden="true">+</span><b>${song.title}</b>
            </button>`).join("")}
        </div>
      </section>`).join("");
    beginAuditStep();
    showView("selection");
  }

  function toggleSelection(id) {
    const limit = selectionLimit();
    const index = state.selection.indexOf(id);
    if (index >= 0) state.selection.splice(index, 1);
    else if (state.selection.length < limit) state.selection.push(id);
    else return showToast(`这一站只能选择 ${limit} 首`);
    save();
    const button = els.selectionGrid.querySelector(`[data-select-id="${id}"]`);
    button?.classList.toggle("selected", state.selection.includes(id));
    els.selectionCount.textContent = `${state.selection.length} / ${limit}`;
    els.confirmSelection.disabled = state.selection.length !== limit;
  }

  function confirmSelection() {
    if (state.selection.length !== selectionLimit()) return;
    pushHistory();
    if (state.selectionMode === "top8Revival") {
      const challenger = state.selection[0];
      const originalMatch = state.bracketRounds.find((round) => round.phase === "duel16")?.matches.find((match) => match.songs.includes(challenger));
      const originalWinner = originalMatch?.winner;
      const defenders = state.top8.filter((id) => id !== originalWinner);
      const defender = (defenders.length ? defenders : state.top8)
        .map(byId)
        .filter(Boolean)
        .sort((a, b) => effectiveSeed(a) - effectiveSeed(b))[0];
      recordDecision("top8-revival-pick", state.top8RevivalCandidates, challenger);
      state.revivalChallenger = challenger;
      state.revivalDefender = defender.id;
      state.duelPairs = [orderPairByFirstRoundSpeed([challenger, defender.id])];
      state.duelIndex = 0;
      state.duelWinners = [];
      state.phase = "duel8Revival";
      save();
      renderDuel();
      return;
    }
    recordDecision("revival", state.eliminated, state.selection);
    launchFirstDuel([...state.directSeeds, ...state.groupWinners, ...state.selection]);
    state.selection = [];
    save();
    renderCheckpoint();
  }

  function launchFirstDuel(ids) {
    const openingPhase = state.firstStageTarget === 64 ? "duel64" : state.firstStageTarget === 32 ? "duel32" : "duel16";
    if (state.firstStageTarget === 64) state.top64 = [...ids];
    else if (state.firstStageTarget === 32) state.top32 = [...ids];
    else state.top16 = [...ids];
    state.duelPairs = makeDuelPairs(ids);
    state.duelIndex = 0;
    state.duelWinners = [];
    setCheckpoint(
      "接下来，开始双歌对决",
      `${state.firstStageTarget} 首歌成功晋级，正在浮向环岛航线。`,
      openingPhase
    );
  }

  function setCheckpoint(title, copy, nextPhase, undoable = false) {
    state.phase = "checkpoint";
    state.checkpoint = { title, copy, nextPhase, undoable };
  }

  function trajectoryStages() {
    const allPhases = ["duel64", "duel32", "duel16", "duel8", "duel4"];
    const startIndex = state.firstStageTarget === 64 ? 0 : state.firstStageTarget === 32 ? 1 : 2;
    const phases = allPhases.slice(startIndex);
    const counts = [64, 32, 16, 8, 4, 2, 1].slice(startIndex);
    const rounds = phases.map((phase) => {
      const completed = state.bracketRounds.find((round) => round.phase === phase);
      if (completed) return { phase, matches: completed.matches.map((match) => ({ ...match, songs: [...match.songs] })) };
      const isPending = state.checkpoint?.nextPhase === phase || state.phase === phase;
      if (!isPending) return null;
      return {
        phase,
        matches: state.duelPairs.map((pair, index) => ({ songs: [...pair], winner: state.phase === phase ? state.duelWinners[index] || null : null }))
      };
    });

    const available = rounds.filter(Boolean);
    if (available.length) {
      for (let index = available.length - 2; index >= 0; index -= 1) {
        const desired = available[index + 1].matches.flatMap((match) => match.songs);
        available[index].matches.sort((a, b) => desired.indexOf(a.winner) - desired.indexOf(b.winner));
      }
    }

    const labels = counts.map((count) => count === 1 ? "Top 1" : `${count}强`);
    const idsByStage = counts.map(() => []);
    if (rounds[0]) idsByStage[0] = rounds[0].matches.flatMap((match) => match.songs);
    else idsByStage[0] = [...(state.firstStageTarget === 64 ? state.top64 : state.firstStageTarget === 32 ? state.top32 : state.top16)];
    phases.forEach((phase, index) => {
      const round = rounds[index];
      if (round?.matches.every((match) => match.winner)) idsByStage[index + 1] = round.matches.map((match) => match.winner);
    });
    idsByStage[counts.length - 2] = state.finalists?.length ? [...state.finalists] : [];
    idsByStage[counts.length - 1] = state.champion ? [state.champion] : [];
    return counts.map((expected, index) => ({ label: labels[index], expected, ids: idsByStage[index] }));
  }

  function renderTrajectory(container) {
    const stages = trajectoryStages();
    container.className = "trajectory-route";
    container.dataset.columns = stages.length;
    container.innerHTML = `<div class="trajectory-board">${stages.map((stage) => `
      <section class="trajectory-stage">
        <b class="trajectory-head">${stage.label}</b>
        <div class="trajectory-cells">${Array.from({ length: stage.expected }, (_, index) => {
          const song = stage.ids[index] ? byId(stage.ids[index]) : null;
          const titleLength = song ? [...song.title].length : 0;
          const lengthClass = titleLength > 12 ? " name-xlong" : titleLength > 8 ? " name-long" : "";
          return `<div class="trajectory-cell${song ? "" : " pending"}${lengthClass}"${song ? ` title="${song.title}"` : ""}><span>${song?.title || ""}</span></div>`;
        }).join("")}</div>
      </section>`).join("")}</div>`;
  }

  function renderCheckpoint() {
    $("#checkpointTitle").textContent = state.checkpoint.title;
    $("#checkpointCopy").textContent = state.checkpoint.copy;
    els.checkpointUndo.hidden = !state.checkpoint.undoable;
    const qualifiedByPhase = {
      duel64: state.top64,
      duel32: state.top32,
      duel16: state.top16,
      duel8: state.top8,
      duel4: state.top4,
      final: state.top2
    };
    const qualified = (qualifiedByPhase[state.checkpoint.nextPhase] || []).map(byId).filter(Boolean);
    els.checkpointBubbles.innerHTML = qualified.map((song, index) => {
      const lane = (index * 37 + 11) % 94;
      const size = Math.max(64, Math.min(112, 116 - [...song.title].length * 3));
      const duration = 8 + (index % 6) * 1.15;
      const delay = -((index * 1.73) % duration);
      const drift = (index % 2 ? 1 : -1) * (18 + (index % 5) * 8);
      return `<span class="advance-bubble source-${song.source}" style="--x:${lane}%;--size:${size}px;--duration:${duration}s;--delay:${delay}s;--drift:${drift}px"><b>${song.title}</b></span>`;
    }).join("");
    showView("checkpoint");
  }

  function continueStage() {
    state.phase = state.checkpoint.nextPhase;
    state.checkpoint = null;
    save();
    renderCurrent();
  }

  function placementRows() {
    const groups = [
      { tier: "champion", ids: state.champion ? [state.champion] : [] },
      { tier: "finalist", ids: state.top2.filter((id) => id !== state.champion) },
      { tier: "top4", ids: state.top4.filter((id) => !state.top2.includes(id)) },
      { tier: "top8", ids: state.top8.filter((id) => !state.top4.includes(id)) },
      { tier: "top16", ids: state.top16.filter((id) => !state.top8.includes(id)) },
      { tier: "top32", ids: state.top32.filter((id) => !state.top16.includes(id)) },
      { tier: "top64", ids: state.top64.filter((id) => !state.top32.includes(id)) }
    ];
    let rank = 1;
    return groups.flatMap((group) => {
      const rankStart = rank;
      const rankEnd = rank + group.ids.length - 1;
      rank = rankEnd + 1;
      return group.ids.map((songId) => ({ songId, tier: group.tier, rankStart, rankEnd }));
    });
  }

  function submissionStatusText(result = state.submission) {
    if (!API_BASE_URL) return "总榜接口尚未配置，本次结果只保存在当前设备。";
    if (!result) return "准备汇入岛民总榜…";
    if (result.state === "pending") return "正在把本次结果汇入岛民总榜…";
    if (result.state === "failed") {
      const detail = result.httpStatus ? `HTTP ${result.httpStatus}` : result.errorCode === "network-error" ? "网络请求失败" : "未知错误";
      return `本次结果暂未上传（${detail}）；可点“重新上传结果”重试。`;
    }
    if (result.reviewStatus === "invalid") return "此设备的结果已被人工标记为无效，当前不计入总榜。";
    if (result.reviewStatus === "suspect") return "结果已收到，因选择速度较快暂不计榜，等待人工复核。";
    return result.replaced ? "已更新此设备在总榜中的唯一一份结果。" : "结果已计入岛民总榜。";
  }

  function updateSubmissionStatus() {
    if (els.submissionStatus) els.submissionStatus.textContent = submissionStatusText();
    if (els.retrySubmission) els.retrySubmission.hidden = state.submission?.state !== "failed";
  }

  async function submitCompletedJourney() {
    updateSubmissionStatus();
    if (!API_BASE_URL || !state?.champion) return;
    const previous = state.submission;
    if (previous?.state === "submitted" && previous.completedAt === state.completedAt) return;
    if (previous?.state === "pending" && Date.now() - Date.parse(previous.attemptedAt || 0) < 30000) return;

    const events = state.auditEvents || [];
    const completedAt = state.completedAt || new Date().toISOString();
    const startedAt = state.createdAt || completedAt;
    const payload = {
      schemaVersion: 2,
      clientVersion: state.version,
      deviceId: anonymousDeviceId(),
      journeyId: state.journeyId || journeyId(),
      startedAt,
      completedAt,
      durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
      catalogSize: state.catalogIds.length,
      bracketSize: state.firstStageTarget,
      config: state.config,
      placements: placementRows().map((item) => ({ ...item, board: boardForSong(byId(item.songId)) })),
      events
    };
    state.journeyId = payload.journeyId;
    state.submission = { state: "pending", completedAt, attemptedAt: new Date().toISOString() };
    save();
    updateSubmissionStatus();

    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(result.error || `HTTP ${response.status}`);
        error.httpStatus = response.status;
        error.errorCode = result.code || "server-error";
        throw error;
      }
      state.submission = {
        state: "submitted",
        completedAt,
        reviewStatus: result.reviewStatus,
        replaced: Boolean(result.replaced),
        submissionId: result.submissionId
      };
    } catch (error) {
      console.warn("Leaderboard submission failed", error);
      state.submission = {
        state: "failed",
        completedAt,
        attemptedAt: new Date().toISOString(),
        httpStatus: Number(error.httpStatus) || 0,
        errorCode: error.errorCode || (error instanceof TypeError ? "network-error" : "client-error"),
        errorMessage: String(error.message || error).slice(0, 240)
      };
    }
    save();
    updateSubmissionStatus();
  }

  function catalogBoardSummary() {
    const counts = { original: 0, ost: 0, stage: 0 };
    state.catalogIds.map(byId).filter(Boolean).forEach((song) => { counts[boardForSong(song)] += 1; });
    return `个人作品 ${counts.original} 首 · OST ${counts.ost} 首 · 现场翻唱 ${counts.stage} 首`;
  }

  function renderResult() {
    const winner = byId(state.champion);
    $("#winnerCover").src = winner.cover;
    $("#winnerCover").onerror = () => { $("#winnerCover").src = FALLBACK_COVER; };
    $("#winnerTitle").textContent = winner.title;
    $("#winnerSource").textContent = winner.release;
    $("#resultPoolCount").textContent = catalogBoardSummary();
    $("#resultUndo").hidden = !state.history?.length;
    renderTrajectory(els.finalRoute);
    renderQrCode();
    showView("result");
    updateContinue();
    submitCompletedJourney();
  }

  function renderCurrent() {
    if (!state) return showView("home");
    if (["landing", "landingTiebreak"].includes(state.phase)) renderLanding();
    else if (["duel64", "duel32", "duel16", "duel8Revival", "duel8", "duel4", "final"].includes(state.phase)) renderDuel();
    else if (["revival", "top8Revival"].includes(state.phase)) renderSelection();
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

  function wrapCanvasText(ctx, text, maxWidth) {
    const lines = [];
    let line = "";
    let lastSpace = -1;
    for (const character of [...text]) {
      const candidate = line + character;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
        if (/\s/.test(character)) lastSpace = line.length - 1;
        continue;
      }
      if (lastSpace >= 0) {
        lines.push(line.slice(0, lastSpace).trimEnd());
        line = `${line.slice(lastSpace + 1)}${character}`.trimStart();
      } else {
        lines.push(line);
        line = character;
      }
      lastSpace = [...line].reduce((position, value, index) => (/\s/.test(value) ? index : position), -1);
    }
    if (line) lines.push(line.trim());
    return lines.filter(Boolean);
  }

  function fitCanvasTitle(ctx, text, maxWidth, maxLines, startSize, weight) {
    for (let fontSize = Math.floor(startSize); fontSize >= 8; fontSize -= 1) {
      ctx.font = `${weight} ${fontSize}px 'Microsoft YaHei'`;
      const lines = wrapCanvasText(ctx, text, maxWidth);
      if (lines.length <= maxLines) return { lines, fontSize };
    }
    ctx.font = `${weight} 8px 'Microsoft YaHei'`;
    return { lines: wrapCanvasText(ctx, text, maxWidth), fontSize: 8 };
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

  function journeyUrl() {
    return JOURNEY_URL;
  }

  function createJourneyQr() {
    if (typeof window.qrcode !== "function") return null;
    const code = window.qrcode(0, "M");
    code.addData(journeyUrl());
    code.make();
    return code;
  }

  function renderQrCode() {
    const code = createJourneyQr();
    els.resultQr.innerHTML = code
      ? code.createImgTag(5, 10, "蛋岛环游记测试页面二维码")
      : '<span class="qr-fallback">二维码生成失败<br>请复制测试链接</span>';
  }

  function drawQrCode(ctx, code, x, y, size) {
    if (!code) return;
    const modules = code.getModuleCount();
    const quiet = 4;
    const cell = size / (modules + quiet * 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#26382d";
    for (let row = 0; row < modules; row += 1) {
      for (let col = 0; col < modules; col += 1) {
        if (code.isDark(row, col)) ctx.fillRect(x + (col + quiet) * cell, y + (row + quiet) * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
  }

  async function drawPoster() {
    const canvas = els.canvas;
    const ctx = canvas.getContext("2d");
    const W = 900;
    const H = 1950;
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
    ctx.fillText("蛋岛环游记 · EGG ISLAND ODYSSEY", 45, 48);
    ctx.fillStyle = "#708074";
    ctx.font = "18px 'Microsoft YaHei'";
    ctx.fillText("蛋岛环游记 / 我的单曲 Top 1", 45, 78);

    const hero = ctx.createLinearGradient(45, 100, 855, 310);
    hero.addColorStop(0, "#284332");
    hero.addColorStop(.6, "#557c45");
    hero.addColorStop(1, "#665394");
    roundRect(ctx, 45, 100, 810, 210, 28);
    ctx.fillStyle = hero;
    ctx.fill();
    if (island) {
      ctx.save(); ctx.globalAlpha = .2; ctx.drawImage(island, 600, 75, 280, 250); ctx.restore();
    }
    ctx.fillStyle = "#f4ef99";
    ctx.font = "900 17px Arial";
    ctx.fillText("MY ONE AND ONLY", 82, 142);
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = "22px 'Microsoft YaHei'";
    ctx.fillText("我心里的单依纯歌曲 Top 1", 82, 178);
    ctx.fillStyle = "#fff";
    const winnerTitle = fitCanvasTitle(ctx, winner.title, 520, 1, 50, 900);
    ctx.fillText(winnerTitle.lines[0], 82, 235);
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = "20px 'Microsoft YaHei'";
    ctx.fillText(fitText(ctx, winner.release, 520), 84, 275);
    if (cover) {
      ctx.save();
      roundRect(ctx, 690, 132, 145, 145, 24);
      ctx.clip();
      ctx.drawImage(cover, 690, 132, 145, 145);
      ctx.restore();
    }

    ctx.fillStyle = "#284332";
    ctx.font = "900 30px 'Microsoft YaHei'";
    ctx.fillText("完整晋级轨迹", 45, 352);
    ctx.fillStyle = "#708074";
    ctx.font = "14px 'Microsoft YaHei'";
    ctx.fillText(catalogBoardSummary(), 315, 351);

    const stages = trajectoryStages();
    const boardX = 45;
    const boardY = 375;
    const boardW = 810;
    const boardH = 1415;
    const headerH = 42;
    const widthWeights = stages.map((_, index) => .82 + index * .13);
    const weightTotal = widthWeights.reduce((sum, value) => sum + value, 0);
    const colors = ["#f3ef8f", "#8fd5d8", "#b2dfb7", "#f4c59f", "#9fc5e8", "#e7a4cd"];
    let x = boardX;
    stages.forEach((stage, stageIndex) => {
      const columnW = stageIndex === stages.length - 1
        ? boardX + boardW - x
        : boardW * widthWeights[stageIndex] / weightTotal;
      ctx.fillStyle = colors[stageIndex] || "#ece8fb";
      ctx.fillRect(x, boardY, columnW, headerH);
      ctx.strokeStyle = "rgba(45,67,49,.22)";
      ctx.strokeRect(x, boardY, columnW, headerH);
      ctx.fillStyle = "#213025";
      ctx.textAlign = "center";
      ctx.font = `900 ${14 + stageIndex}px 'Microsoft YaHei'`;
      ctx.fillText(stage.label, x + columnW / 2, boardY + 27);

      const contentY = boardY + headerH;
      const contentH = boardH - headerH;
      const cellH = contentH / stage.ids.length;
      stage.ids.forEach((id, itemIndex) => {
        const y = contentY + itemIndex * cellH;
        ctx.fillStyle = itemIndex % 2 ? "rgba(249,250,247,.94)" : "rgba(255,255,255,.96)";
        ctx.fillRect(x, y, columnW, cellH);
        ctx.strokeStyle = "rgba(45,67,49,.22)";
        ctx.strokeRect(x, y, columnW, cellH);
        ctx.fillStyle = stageIndex === stages.length - 1 ? "#4c3d7d" : "#26382d";
        const weight = stageIndex > 2 ? 900 : 750;
        const startSize = Math.min(15 + stageIndex * 5, Math.max(10, (cellH - 4) * .42));
        const fitted = fitCanvasTitle(ctx, byId(id).title, columnW - 10, 2, startSize, weight);
        const visibleLines = fitted.lines.slice(0, 2);
        const lineHeight = fitted.fontSize * 1.12;
        const firstBaseline = y + cellH / 2 - ((visibleLines.length - 1) * lineHeight) / 2 + fitted.fontSize * .34;
        visibleLines.forEach((line, lineIndex) => {
          ctx.fillText(line, x + columnW / 2, firstBaseline + lineIndex * lineHeight);
        });
      });
      x += columnW;
    });
    drawQrCode(ctx, createJourneyQr(), 748, 1810, 105);
    ctx.textAlign = "left";
    ctx.fillStyle = "#284332";
    ctx.font = "900 20px 'Microsoft YaHei'";
    ctx.fillText("把蛋岛地图漂流给下一位纯牛奶", 45, 1845);
    ctx.fillStyle = "#708074";
    ctx.font = "16px 'Microsoft YaHei'";
    ctx.fillText("曲库来源：公开发行作品、影视原声与公开舞台整理", 45, 1882);
    ctx.fillText(`选择只保存在本机 · 蛋岛环游记 · ${new Date().toLocaleDateString("zh-CN")}`, 45, 1918);
    ctx.textAlign = "left";
    posterBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", .95));
  }

  async function openPoster() {
    await drawPoster();
    if (isWeChat) {
      // WeChat blocks Blob downloads and file sharing. A real image element can
      // still be saved or forwarded from its native long-press menu.
      els.posterImage.src = els.canvas.toDataURL("image/png");
      els.posterImage.hidden = false;
      els.canvas.hidden = true;
      els.posterSaveHint.hidden = false;
      $("#downloadPoster").textContent = "长按图片保存";
      $("#sharePoster").textContent = "长按图片分享";
    } else {
      els.posterImage.hidden = true;
      els.canvas.hidden = false;
      els.posterSaveHint.hidden = true;
    }
    els.posterDialog.showModal();
  }

  function showWechatPosterGuide() {
    els.posterImage.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("请长按图片，选择“保存图片”或“发送给朋友”");
  }

  function downloadPoster() {
    if (!posterBlob) return;
    if (isWeChat) {
      showWechatPosterGuide();
      return;
    }
    const url = URL.createObjectURL(posterBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `蛋岛环游记-${byId(state.champion).title}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function sharePoster() {
    if (!posterBlob) return;
    if (isWeChat) {
      showWechatPosterGuide();
      return;
    }
    const winner = byId(state.champion);
    const file = new File([posterBlob], `蛋岛环游记-${winner.title}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: "蛋岛环游记", text: `我心里的单依纯歌曲 Top 1 是《${winner.title}》`, files: [file] }); }
      catch (error) { if (error.name !== "AbortError") showToast("分享没有完成，可以先保存图片"); }
    } else {
      downloadPoster();
      showToast("当前浏览器不支持直接分享，已保存图片");
    }
  }

  function createAudioSystem() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    const context = new AudioContext();
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1500;
    master.gain.value = 0;
    master.connect(filter).connect(context.destination);
    const progression = [
      [261.63, 329.63, 392, 493.88],
      [220, 261.63, 329.63, 392],
      [174.61, 220, 261.63, 329.63],
      [196, 261.63, 293.66, 392]
    ];
    let enabled = false;
    let timer = null;
    let step = 0;
    let nextNoteAt = 0;

    function tone(frequency, start, duration, volume, type = "sine") {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.detune.value = type === "triangle" ? -4 : 3;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(.16, duration * .25));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(master);
      oscillator.start(start);
      oscillator.stop(start + duration + .05);
    }

    function schedule() {
      while (nextNoteAt < context.currentTime + .8) {
        const chord = progression[Math.floor(step / 8) % progression.length];
        const note = chord[[0, 2, 1, 3, 2, 1, 0, 2][step % 8]];
        tone(note, nextNoteAt, 1.6, .032);
        if (step % 8 === 0) {
          tone(chord[0] / 2, nextNoteAt, 3.7, .026, "triangle");
          chord.slice(1).forEach((frequency, index) => tone(frequency / 2, nextNoteAt + index * .045, 3.25, .011));
        }
        nextNoteAt += .5;
        step += 1;
      }
    }

    function setEnabled(value) {
      enabled = value;
      context.resume();
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(value ? .72 : 0.0001, context.currentTime, value ? .7 : .12);
      if (value) {
        nextNoteAt = Math.max(nextNoteAt, context.currentTime + .05);
        schedule();
        timer = timer || setInterval(schedule, 300);
      } else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function clickSound() {
      if (!enabled) return;
      const now = context.currentTime;
      tone(660, now, .11, .07);
      tone(880, now + .055, .14, .045, "triangle");
    }

    return { setEnabled, clickSound, get enabled() { return enabled; } };
  }

  function toggleMusic() {
    audio = audio || createAudioSystem();
    if (!audio) {
      showToast("当前浏览器暂不支持网页音乐");
      return;
    }
    const enabled = !audio.enabled;
    audio.setEnabled(enabled);
    const button = $("#musicToggle");
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? "关闭背景音乐和按钮音效" : "开启背景音乐和按钮音效");
    $(".music-label", button).textContent = enabled ? "音乐:开" : "音乐:关";
    showToast(enabled ? "原创舒缓 BGM 已开启" : "音乐与按钮音效已关闭");
  }

  function answerSoundPrompt(enable) {
    $("#soundPrompt").close();
    if (enable) toggleMusic();
  }

  function bindEvents() {
    $("#musicToggle").addEventListener("click", toggleMusic);
    $("#enableSound").addEventListener("click", () => answerSoundPrompt(true));
    $("#disableSound").addEventListener("click", () => answerSoundPrompt(false));
    $("#soundPrompt").addEventListener("cancel", () => answerSoundPrompt(false));
    document.addEventListener("click", (event) => {
      if (event.target.closest("button") && !event.target.closest("#musicToggle")) audio?.clickSound();
    });
    $$('[data-home]').forEach((button) => button.addEventListener("click", () => showView("home")));
    $("#startJourney").addEventListener("click", startJourney);
    els.collectionToggles.addEventListener("change", updateSelectedCount);
    els.toggleStageDetails.addEventListener("click", () => {
      const expanded = els.toggleStageDetails.getAttribute("aria-expanded") === "true";
      els.toggleStageDetails.setAttribute("aria-expanded", String(!expanded));
      els.stageDetailContent.hidden = expanded;
      $("i", els.toggleStageDetails).textContent = expanded ? "＋" : "－";
    });
    els.stageDetailContent.addEventListener("change", updateSelectedCount);
    els.stageDetailContent.addEventListener("click", (event) => {
      const button = event.target.closest("[data-toggle-stage-group]");
      if (!button) return;
      const inputs = $$(`input[data-stage-collection]`, els.stageDetailContent).filter((input) => {
        const item = STAGE_COLLECTIONS.find((candidate) => candidate.key === input.value);
        return item?.group === button.dataset.toggleStageGroup;
      });
      const nextChecked = !inputs.every((input) => input.checked);
      inputs.forEach((input) => { input.checked = nextChecked; });
      updateSelectedCount();
    });
    $$('input[name="vocalScope"]').forEach((input) => input.addEventListener("change", updateSelectedCount));
    els.continueJourney.addEventListener("click", () => { state = load(); renderCurrent(); });
    $("#pauseJourney").addEventListener("click", () => { save(); updateContinue(); showView("home"); });
    els.undoChoice.addEventListener("click", undoLastChoice);
    els.checkpointUndo.addEventListener("click", undoLastChoice);
    $("#resultUndo").addEventListener("click", undoLastChoice);
    els.choiceGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-song-id]");
      if (!button || els.choiceGrid.classList.contains("choice-locked")) return;
      els.choiceGrid.classList.add("choice-locked");
      button.classList.add("is-chosen");
      button.setAttribute("aria-pressed", "true");
      const phase = state.phase;
      const songId = button.dataset.songId;
      setTimeout(() => {
        if (phase === "landing") chooseLanding(songId);
        else if (phase === "landingTiebreak") chooseLandingTiebreak(songId);
        else chooseDuel(songId);
      }, 230);
    });
    els.unfamiliarAction.addEventListener("click", () => chooseLanding(null));
    els.selectionGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-select-id]");
      if (button) toggleSelection(button.dataset.selectId);
    });
    els.confirmSelection.addEventListener("click", confirmSelection);
    els.checkpointSky.addEventListener("click", continueStage);
    els.checkpointSky.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        continueStage();
      }
    });
    $("#restartJourney").addEventListener("click", () => {
      const config = state.config;
      clear();
      renderJourneyConfig(config);
      startJourney();
    });
    $("#copyJourneyLink").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(journeyUrl()); showToast("测试链接已复制"); }
      catch { showToast("复制失败，请使用浏览器分享地址"); }
    });
    els.retrySubmission?.addEventListener("click", () => submitCompletedJourney());
    $("#makePoster").addEventListener("click", openPoster);
    $("#downloadPoster").addEventListener("click", downloadPoster);
    $("#sharePoster").addEventListener("click", sharePoster);
    $("#openAbout").addEventListener("click", () => els.aboutDialog.showModal());
    $$('[data-close-about]').forEach((button) => button.addEventListener("click", () => els.aboutDialog.close()));
    $$('[data-close-poster]').forEach((button) => button.addEventListener("click", () => els.posterDialog.close()));
  }

  function init() {
    renderJourneyConfig();
    bindEvents();
    updateContinue();
    $("#soundPrompt").showModal();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  init();
})();
