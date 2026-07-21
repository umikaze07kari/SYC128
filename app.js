(() => {
  "use strict";

  const songs = window.SONG_CATALOG || [];
  const STORAGE_KEY = "dan-island-odyssey-v10";
  const LEGACY_STORAGE_KEY = "dan-island-odyssey-v9";
  const FALLBACK_COVER = "assets/cover-fallback.svg";
  const LANDING_GROUP_SIZE = 4;
  const OPTIONAL_COLLECTIONS = [
    { key: "ost", label: "影视原声", match: (song) => song.source === "ost" },
    { key: "singer2025", label: "歌手2025", match: (song) => song.source === "live" },
    { key: "voice2020", label: "2020中国好声音", match: (song) => song.release.includes("2020中国好声音") },
    { key: "giftedVoice", label: "天赐的声音", match: (song) => song.release.includes("天赐的声音") },
    { key: "praiseSong", label: "为歌而赞", match: (song) => song.release.includes("为歌而赞") },
    { key: "rapListen", label: "说唱听我的", match: (song) => song.release.includes("说唱听我的") },
    { key: "burstStage", label: "爆裂舞台", match: (song) => song.release.includes("爆裂舞台") },
    { key: "ourSong", label: "我们的歌", match: (song) => song.release.includes("我们的歌") },
    { key: "infinitySound", label: "声生不息·港乐季", match: (song) => song.release.includes("声生不息·港乐季") },
    { key: "dramaSongs", label: "剧好听的歌", match: (song) => song.release.includes("剧好听的歌") },
    { key: "musicPlan", label: "音乐缘计划", match: (song) => song.release.includes("音乐缘计划") },
    { key: "chinaMusic", label: "国乐无双", match: (song) => song.release.includes("国乐无双") }
  ];
  const DEFAULT_COLLECTIONS = ["ost", "singer2025", "voice2020"];
  const ROUND_LABELS = {
    duel40: "四十进二十",
    duel20: "二十进十",
    duel10: "十进五",
    final: "岛主决选"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = (id) => songs.find((song) => song.id === id);

  const els = {
    views: $$(".view"),
    continueJourney: $("#continueJourney"),
    collectionToggles: $("#collectionToggles"),
    selectedSongCount: $("#selectedSongCount"),
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
    checkpointRoute: $("#checkpointRoute"),
    checkpointUndo: $("#checkpointUndo"),
    finalRoute: $("#finalRoute"),
    aboutDialog: $("#aboutDialog"),
    posterDialog: $("#posterDialog"),
    canvas: $("#resultCanvas"),
    resultQr: $("#resultQr"),
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
    document.body.dataset.view = name;
    window.scrollTo(0, 0);
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

  function makeLandingGroups(pool) {
    const ranked = [...pool].sort((a, b) => effectiveSeed(b) - effectiveSeed(a));
    const directCount = pool.length % LANDING_GROUP_SIZE || LANDING_GROUP_SIZE;
    const directSeeds = ranked.splice(0, directCount);
    const groupCount = (pool.length - directCount) / LANDING_GROUP_SIZE;
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

  function firstStageTargetFor(size) {
    return size >= 64 ? 40 : 20;
  }

  function readJourneyConfig() {
    return {
      includeCollabs: $('input[name="vocalScope"]:checked')?.value !== "solo",
      collections: $$('#collectionToggles input:checked').map((input) => input.value)
    };
  }

  function songsForConfig(config) {
    const enabled = new Set(config.collections);
    return songs.filter((song) => {
      const core = song.source === "album" || song.source === "single";
      const optional = OPTIONAL_COLLECTIONS.some((collection) => enabled.has(collection.key) && collection.match(song));
      return (core || optional) && (config.includeCollabs || song.vocal !== "collab");
    });
  }

  function renderJourneyConfig(config = null) {
    const enabled = new Set(config?.collections || DEFAULT_COLLECTIONS);
    els.collectionToggles.innerHTML = OPTIONAL_COLLECTIONS.map((collection) => `
      <label class="collection-switch"><input type="checkbox" value="${collection.key}" ${enabled.has(collection.key) ? "checked" : ""}><span>${collection.label}</span></label>`).join("");
    const vocal = config?.includeCollabs === false ? "solo" : "all";
    $(`input[name="vocalScope"][value="${vocal}"]`).checked = true;
    updateSelectedCount();
  }

  function updateSelectedCount() {
    const count = songsForConfig(readJourneyConfig()).length;
    els.selectedSongCount.textContent = `${count} 首`;
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
    const { directSeeds, groups } = makeLandingGroups(pool);
    return {
      version: 10,
      createdAt: new Date().toISOString(),
      catalogIds: pool.map((song) => song.id),
      config,
      firstStageTarget: firstStageTargetFor(pool.length),
      phase: "landing",
      directSeeds,
      groups,
      groupIndex: 0,
      groupWinners: [],
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
      top40: [],
      top20: [],
      top10: [],
      top5: [],
      finalists: [],
      champion: null,
      checkpoint: null,
      history: []
    };
  }

  function save() {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY));
      if (saved?.version === 10) return saved;
      if (saved?.version === 9) {
        return { ...saved, version: 10, landingChoiceMs: {}, landingGroupStartedAt: null };
      }
      return null;
    } catch {
      return null;
    }
  }

  function clear() {
    state = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    updateContinue();
  }

  function updateContinue() {
    const saved = load();
    els.continueJourney.hidden = !saved;
    if (saved) els.continueJourney.textContent = saved.phase === "complete" ? "查看上次岛主" : "继续上次环游";
  }

  function imageMarkup(song, className = "") {
    return `<img class="${className}" src="${song.cover}" alt="《${song.title}》封面" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_COVER}'">`;
  }

  function shortLine(song) {
    return song.cardLines[0] || "听见属于它的独特颜色";
  }

  function choiceCard(song) {
    return `
      <button class="cover-choice source-${song.source}" type="button" data-song-id="${song.id}">
        <div class="cover-frame">${imageMarkup(song)}<em>${song.sourceLabel}${song.vocal === "collab" ? " · 合唱" : ""}</em></div>
        <div class="choice-info">
          <h3>${song.title}</h3>
          <small>${song.release}</small>
          <div class="mini-lyric">${shortLine(song)}</div>
        </div>
      </button>`;
  }

  function startJourney() {
    const config = readJourneyConfig();
    const pool = songsForConfig(config);
    state = freshState(pool, config);
    save();
    renderCurrent();
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
    const group = state.groups[state.groupIndex].map(byId);
    els.stageEnglish.textContent = "LANDING ROUND";
    els.stageTitle.textContent = "登岛海选 · 四选一";
    els.stageCounter.textContent = `${state.groupIndex + 1} / ${state.groups.length}`;
    els.roundProgress.style.width = `${(state.groupIndex / state.groups.length) * 100}%`;
    els.choiceHint.textContent = "从这组里留下唯一一首";
    els.choiceTitle.textContent = "哪一首值得先登岛？";
    els.choiceGrid.className = "choice-grid four-up";
    els.choiceGrid.innerHTML = group.map(choiceCard).join("");
    if (!Number.isFinite(state.landingGroupStartedAt)) {
      state.landingGroupStartedAt = Date.now();
      save();
    }
    els.unfamiliarAction.hidden = false;
    els.matchNote.hidden = false;
    updateUndo();
    showView("battle");
  }

  function chooseLanding(winnerId) {
    pushHistory();
    const group = state.groups[state.groupIndex];
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

  function renderDuel() {
    const pair = state.duelPairs[state.duelIndex].map(byId);
    const isFinal = state.phase === "final";
    const isTop40 = state.phase === "duel40";
    const isTop20 = state.phase === "duel20";
    els.stageEnglish.textContent = isFinal ? "ISLAND OWNER FINAL" : (isTop40 ? "COASTLINE DUEL" : (isTop20 ? "TIDAL DUEL" : "INNER ISLAND DUEL"));
    els.stageTitle.textContent = isFinal ? "岛主决选 · 二选一" : (isTop40 ? "四十进二十 · 二选一" : (isTop20 ? "二十进十 · 二选一" : "十进五 · 二选一"));
    els.stageCounter.textContent = `${state.duelIndex + 1} / ${state.duelPairs.length}`;
    els.roundProgress.style.width = `${(state.duelIndex / state.duelPairs.length) * 100}%`;
    els.choiceHint.textContent = isFinal ? "最后一次，只听自己的偏爱" : "这一轮不再设跳过";
    els.choiceTitle.textContent = isFinal ? "谁来成为蛋岛岛主？" : "这一组，谁继续向岛心前进？";
    els.choiceGrid.className = "choice-grid duel";
    els.choiceGrid.innerHTML = pair.map(choiceCard).join("");
    els.unfamiliarAction.hidden = true;
    els.matchNote.hidden = true;
    updateUndo();
    showView("battle");
  }

  function chooseDuel(winnerId) {
    pushHistory();
    state.duelWinners.push(winnerId);
    state.duelIndex += 1;
    if (state.duelIndex < state.duelPairs.length) {
      save();
      renderDuel();
      return;
    }
    state.bracketRounds.push({
      phase: state.phase,
      label: ROUND_LABELS[state.phase],
      matches: state.duelPairs.map((pair, index) => ({ songs: [...pair], winner: state.duelWinners[index] }))
    });
    if (state.phase === "duel40") {
      state.top20 = [...state.duelWinners];
      state.duelPairs = makeDuelPairs(state.top20);
      state.duelIndex = 0;
      state.duelWinners = [];
      setCheckpoint("二十座音乐岛已经亮起", "下一站二十进十，偏爱继续收紧。", "duel20", true);
    } else if (state.phase === "duel20") {
      state.top10 = [...state.duelWinners];
      state.duelPairs = makeDuelPairs(state.top10);
      state.duelIndex = 0;
      state.duelWinners = [];
      setCheckpoint("十座内岛已经升起", "接下来十进五，选择会变得更难。", "duel10", true);
    } else if (state.phase === "duel10") {
      state.top5 = [...state.duelWinners];
      state.selection = [];
      state.selectionMode = "council";
      setCheckpoint("五首歌抵达岛心", "下一站是岛主议会：五选二。", "council", true);
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
      ? `从离岛歌曲中选回 <b id="selectionNeed">${limit}</b> 首，补足${state.firstStageTarget === 40 ? "四十" : "二十"}强。`
      : `从五强中同时选出 <b id="selectionNeed">2</b> 首，进入最终决选。`;
    els.selectionNeed = $("#selectionNeed");
    els.selectionCount.textContent = `${state.selection.length} / ${limit}`;
    els.confirmSelection.disabled = state.selection.length !== limit;
    els.selectionGrid.className = revival ? "selection-grid compact-grid" : "selection-grid";
    els.selectionGrid.innerHTML = selectionCandidates().map((song) => revival ? `
      <button class="select-card compact source-${song.source} ${state.selection.includes(song.id) ? "selected" : ""}" type="button" data-select-id="${song.id}" title="${song.title}">
        <span aria-hidden="true">+</span><b>${song.title}</b>
      </button>` : `
      <button class="select-card source-${song.source} ${state.selection.includes(song.id) ? "selected" : ""}" type="button" data-select-id="${song.id}">
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
      launchFirstDuel([...state.directSeeds, ...state.groupWinners, ...state.selection]);
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

  function launchFirstDuel(ids) {
    const startsAt40 = state.firstStageTarget === 40;
    if (startsAt40) state.top40 = [...ids];
    else state.top20 = [...ids];
    state.duelPairs = makeDuelPairs(ids);
    state.duelIndex = 0;
    state.duelWinners = [];
    setCheckpoint(
      `${state.firstStageTarget} 首歌进入环岛航线`,
      "海选与复活完成，下一站开始双歌对决。",
      startsAt40 ? "duel40" : "duel20"
    );
  }

  function setCheckpoint(title, copy, nextPhase, undoable = false) {
    state.phase = "checkpoint";
    state.checkpoint = { title, copy, nextPhase, undoable };
  }

  function councilOrder(ids) {
    if (state.finalists?.length !== 2) return ids;
    const remaining = ids.filter((id) => !state.finalists.includes(id));
    return [remaining[0], state.finalists[0], remaining[1], state.finalists[1], ...remaining.slice(2)].filter(Boolean);
  }

  function trajectoryStages() {
    const phases = state.firstStageTarget === 40 ? ["duel40", "duel20", "duel10"] : ["duel20", "duel10"];
    const counts = state.firstStageTarget === 40 ? [40, 20, 10, 5, 2, 1] : [20, 10, 5, 2, 1];
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
      const last = available.at(-1);
      if (last.matches.every((match) => match.winner)) {
        const desired = councilOrder(last.matches.map((match) => match.winner));
        last.matches.sort((a, b) => desired.indexOf(a.winner) - desired.indexOf(b.winner));
      }
      for (let index = available.length - 2; index >= 0; index -= 1) {
        const desired = available[index + 1].matches.flatMap((match) => match.songs);
        available[index].matches.sort((a, b) => desired.indexOf(a.winner) - desired.indexOf(b.winner));
      }
    }

    const labels = counts.map((count) => count === 1 ? "冠军" : `${count}强`);
    const idsByStage = counts.map(() => []);
    if (rounds[0]) idsByStage[0] = rounds[0].matches.flatMap((match) => match.songs);
    else idsByStage[0] = state.firstStageTarget === 40 ? [...state.top40] : [...state.top20];
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
          return `<div class="trajectory-cell${song ? "" : " pending"}"${song ? ` title="${song.title}"` : ""}><span>${song?.title || ""}</span></div>`;
        }).join("")}</div>
      </section>`).join("")}</div>`;
  }

  function renderCheckpoint() {
    $("#checkpointTitle").textContent = state.checkpoint.title;
    $("#checkpointCopy").textContent = state.checkpoint.copy;
    els.checkpointUndo.hidden = !state.checkpoint.undoable;
    $("#checkpointRouteTitle").textContent = "完整晋级轨迹";
    $("#checkpointRouteHint").textContent = "尚未产生的轮次暂时留空";
    renderTrajectory(els.checkpointRoute);
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
    $("#resultPoolCount").textContent = `${state.catalogIds.length} 首 · 完整晋级轨迹`;
    $("#resultUndo").hidden = !state.history?.length;
    renderTrajectory(els.finalRoute);
    renderQrCode();
    showView("result");
    updateContinue();
  }

  function renderCurrent() {
    if (!state) return showView("home");
    if (state.phase === "landing") renderLanding();
    else if (["duel40", "duel20", "duel10", "final"].includes(state.phase)) renderDuel();
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

  function journeyUrl() {
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    return url.href;
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
      ? code.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
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
    ctx.fillText("蛋岛环游记 · DAN ISLAND ODYSSEY", 45, 48);
    ctx.fillStyle = "#708074";
    ctx.font = "18px 'Microsoft YaHei'";
    ctx.fillText("蛋岛环游记 / 我的唯一岛主", 45, 78);

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
    ctx.fillText("OWNER OF DAN ISLAND", 82, 142);
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = "22px 'Microsoft YaHei'";
    ctx.fillText("我的蛋岛岛主是", 82, 178);
    ctx.fillStyle = "#fff";
    ctx.font = "900 50px 'Microsoft YaHei'";
    ctx.fillText(fitText(ctx, winner.title, 520), 82, 235);
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
    ctx.fillText("格高与字号逐轮递增 · 五强经岛主议会选出决赛席位", 255, 351);

    const stages = trajectoryStages();
    const boardX = 45;
    const boardY = 375;
    const boardW = 810;
    const boardH = 1415;
    const headerH = 42;
    const widthWeights = stages.map((_, index) => .82 + index * .13);
    const weightTotal = widthWeights.reduce((sum, value) => sum + value, 0);
    const colors = ["#f4ef99", "#9ddfe0", "#bdebc3", "#ffd3ad", "#acd1f3", "#efafd5"];
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
        const fontSize = Math.min(15 + stageIndex * 5, Math.max(12, cellH * .42));
        ctx.font = `${stageIndex > 2 ? 900 : 750} ${fontSize}px 'Microsoft YaHei'`;
        ctx.fillText(fitText(ctx, byId(id).title, columnW - 12), x + columnW / 2, y + cellH / 2 + fontSize * .34);
      });
      x += columnW;
    });
    drawQrCode(ctx, createJourneyQr(), 748, 1810, 105);
    ctx.textAlign = "left";
    ctx.fillStyle = "#284332";
    ctx.font = "900 20px 'Microsoft YaHei'";
    ctx.fillText("长按识别二维码，开始你的蛋岛环游", 45, 1845);
    ctx.fillStyle = "#708074";
    ctx.font = "16px 'Microsoft YaHei'";
    ctx.fillText("选择只保存在本机 · 蛋岛环游记", 45, 1882);
    ctx.fillText(new Date().toLocaleDateString("zh-CN"), 45, 1918);
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
    link.download = `蛋岛环游记-${byId(state.champion).title}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function sharePoster() {
    if (!posterBlob) return;
    const winner = byId(state.champion);
    const file = new File([posterBlob], `蛋岛环游记-${winner.title}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: "蛋岛环游记", text: `我的蛋岛岛主是《${winner.title}》`, files: [file] }); }
      catch (error) { if (error.name !== "AbortError") showToast("分享没有完成，可以先保存图片"); }
    } else {
      downloadPoster();
      showToast("当前浏览器不支持直接分享，已保存图片");
    }
  }

  function bindEvents() {
    $$('[data-home]').forEach((button) => button.addEventListener("click", () => showView("home")));
    $("#startJourney").addEventListener("click", startJourney);
    els.collectionToggles.addEventListener("change", updateSelectedCount);
    $$('input[name="vocalScope"]').forEach((input) => input.addEventListener("change", updateSelectedCount));
    els.continueJourney.addEventListener("click", () => { state = load(); renderCurrent(); });
    $("#pauseJourney").addEventListener("click", () => { save(); updateContinue(); showView("home"); });
    els.undoChoice.addEventListener("click", undoLastChoice);
    els.checkpointUndo.addEventListener("click", undoLastChoice);
    $("#resultUndo").addEventListener("click", undoLastChoice);
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
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  init();
})();
