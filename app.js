(() => {
  "use strict";

  const songs = window.SONG_CATALOG || [];
  const meta = window.SONG_META || {};
  const STORAGE_KEY = "pure-pick-battle-v1";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = (id) => songs.find((song) => song.id === id);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const els = {
    views: $$(".view"),
    home: $("#homeView"),
    setup: $("#setupView"),
    battle: $("#battleView"),
    result: $("#resultView"),
    continueBattle: $("#continueBattle"),
    sourceFilters: $("#sourceFilters"),
    vocalFilters: $("#vocalFilters"),
    sizeOptions: $("#sizeOptions"),
    poolCount: $("#poolCount"),
    poolPreview: $("#poolPreview"),
    launchBattle: $("#launchBattle"),
    choiceA: $("#choiceA"),
    choiceB: $("#choiceB"),
    battleProgress: $("#battleProgress"),
    progressText: $("#progressText"),
    roundLabel: $("#roundLabel"),
    roundTitle: $("#roundTitle"),
    matchReason: $("#matchReason"),
    undoChoice: $("#undoChoice"),
    aboutDialog: $("#aboutDialog"),
    posterDialog: $("#posterDialog"),
    canvas: $("#resultCanvas"),
    toast: $("#toast")
  };

  const setupState = {
    size: 32,
    sources: new Set(Object.keys(meta.source || {})),
    vocals: new Set(Object.keys(meta.vocal || {})),
    pairing: "smart"
  };

  let battleState = null;
  let toastTimer = null;
  let posterBlob = null;

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  function showView(name) {
    els.views.forEach((view) => view.classList.toggle("active", view.id === `${name}View`));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function safeLoad() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== 1 || !Array.isArray(saved.rounds)) return null;
      return saved;
    } catch {
      return null;
    }
  }

  function saveBattle() {
    if (!battleState) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(battleState));
    $("#saveStatus").textContent = "已自动保存";
  }

  function clearBattle() {
    battleState = null;
    localStorage.removeItem(STORAGE_KEY);
    updateContinueButton();
  }

  function updateContinueButton() {
    const saved = safeLoad();
    els.continueBattle.hidden = !saved;
    els.continueBattle.textContent = saved?.complete ? "查看上次结果" : "继续上次进度";
  }

  function renderFilters() {
    els.sourceFilters.innerHTML = Object.entries(meta.source).map(([key, label]) =>
      `<button type="button" class="chip selected" data-filter-type="source" data-value="${key}">${label}</button>`
    ).join("");
    els.vocalFilters.innerHTML = Object.entries(meta.vocal).map(([key, label]) =>
      `<button type="button" class="chip selected" data-filter-type="vocal" data-value="${key}">${label}</button>`
    ).join("");
  }

  function filteredSongs() {
    return songs.filter((song) => setupState.sources.has(song.source) && setupState.vocals.has(song.vocal));
  }

  function selectPool() {
    const available = filteredSongs().sort((a, b) => b.popularity - a.popularity);
    if (available.length <= setupState.size) return available;

    // 先保留高热度候选，再以“来源 + 情绪”轮转补位，避免 16 首模式过于单一。
    const picked = available.slice(0, Math.ceil(setupState.size / 2));
    const remaining = available.filter((song) => !picked.includes(song));
    const groups = new Map();
    remaining.forEach((song) => {
      const key = `${song.source}-${song.mood}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(song);
    });
    while (picked.length < setupState.size && groups.size) {
      [...groups.entries()].forEach(([key, group]) => {
        if (picked.length < setupState.size && group.length) picked.push(group.shift());
        if (!group.length) groups.delete(key);
      });
    }
    return picked;
  }

  function updatePoolPreview() {
    const available = filteredSongs();
    const pool = selectPool();
    els.poolCount.textContent = `${pool.length} / ${setupState.size}`;
    els.poolPreview.innerHTML = pool.map((song, index) => `
      <div class="mini-song">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <b>${song.title}</b>
        <small>${song.sourceLabel} · ${song.popularity}</small>
      </div>`).join("");
    const enough = available.length >= setupState.size;
    els.launchBattle.disabled = !enough;
    els.launchBattle.firstChild.textContent = enough ? "生成对阵并开始 " : `还需选择 ${setupState.size - available.length} 首 `;
  }

  function toggleFilter(button) {
    const type = button.dataset.filterType;
    const value = button.dataset.value;
    const set = type === "source" ? setupState.sources : setupState.vocals;
    if (set.has(value) && set.size === 1) {
      showToast("至少保留一种筛选类型");
      return;
    }
    if (set.has(value)) set.delete(value); else set.add(value);
    button.classList.toggle("selected", set.has(value));
    updatePoolPreview();
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function similarity(a, b) {
    let score = 0;
    if (a.source === b.source) score += 5;
    if (a.vocal === b.vocal) score += 3;
    if (a.mood === b.mood) score += 2;
    score -= Math.abs(a.popularity - b.popularity) * .015;
    return score;
  }

  function pairReason(a, b, seeded = false) {
    const matches = [];
    if (a.source === b.source) matches.push(`同为${a.sourceLabel}`);
    if (a.vocal === b.vocal) matches.push(`同为${a.vocalLabel}`);
    if (a.mood === b.mood) matches.push(`同属${a.mood}气质`);
    if (seeded) matches.push("种子分区保护");
    return matches.length ? matches.slice(0, 2).join(" · ") : "跨类型惊喜相遇";
  }

  function smartFirstRound(pool) {
    const ranked = [...pool].sort((a, b) => b.popularity - a.popularity);
    const seedCount = Math.max(2, Math.floor(pool.length / 4));
    const seeds = ranked.slice(0, seedCount);
    const candidates = ranked.slice(seedCount);
    const seedPairs = seeds.map((seed) => {
      let bestIndex = 0;
      candidates.forEach((candidate, index) => {
        if (similarity(seed, candidate) > similarity(seed, candidates[bestIndex])) bestIndex = index;
      });
      const opponent = candidates.splice(bestIndex, 1)[0];
      return { a: seed.id, b: opponent.id, winner: null, reason: pairReason(seed, opponent, true), seedRank: seeds.indexOf(seed) + 1 };
    });

    const otherPairs = [];
    while (candidates.length) {
      const first = candidates.shift();
      let bestIndex = 0;
      candidates.forEach((candidate, index) => {
        if (similarity(first, candidate) > similarity(first, candidates[bestIndex])) bestIndex = index;
      });
      const second = candidates.splice(bestIndex, 1)[0];
      otherPairs.push({ a: first.id, b: second.id, winner: null, reason: pairReason(first, second) });
    }

    // 常用的种子蛇形顺序；再与普通对局交错，让头部种子尽量分处不同小区。
    const seedOrders = {
      4: [1, 4, 2, 3],
      8: [1, 8, 4, 5, 2, 7, 3, 6]
    };
    const order = seedOrders[seedCount] || seeds.map((_, index) => index + 1);
    const orderedSeeds = order.map((rank) => seedPairs.find((pair) => pair.seedRank === rank));
    const pairs = [];
    orderedSeeds.forEach((pair, index) => {
      pairs.push(pair);
      if (otherPairs[index]) pairs.push(otherPairs[index]);
    });
    return pairs.concat(otherPairs.slice(orderedSeeds.length));
  }

  function randomFirstRound(pool) {
    const mixed = shuffle(pool);
    const pairs = [];
    for (let i = 0; i < mixed.length; i += 2) {
      pairs.push({ a: mixed[i].id, b: mixed[i + 1].id, winner: null, reason: "完全随机相遇" });
    }
    return pairs;
  }

  function beginBattle() {
    const pool = selectPool();
    if (pool.length < setupState.size) return;
    const firstPairs = setupState.pairing === "smart" ? smartFirstRound(pool) : randomFirstRound(pool);
    battleState = {
      version: 1,
      createdAt: new Date().toISOString(),
      poolSize: pool.length,
      pairing: setupState.pairing,
      selectedSongIds: pool.map((song) => song.id),
      rounds: [{ size: pool.length, pairs: firstPairs }],
      currentRound: 0,
      currentPair: 0,
      completedMatches: 0,
      totalMatches: pool.length - 1,
      history: [],
      complete: false
    };
    saveBattle();
    showView("battle");
    renderBattle();
  }

  function currentPair() {
    return battleState?.rounds[battleState.currentRound]?.pairs[battleState.currentPair];
  }

  function roundChinese(roundIndex, size) {
    const labels = { 32: "32 强 · 第一轮", 16: "16 强 · 第二轮", 8: "8 强 · 四分之一决赛", 4: "4 强 · 半决赛", 2: "冠军争夺战" };
    return labels[size] || `第 ${roundIndex + 1} 轮`;
  }

  function songCardMarkup(song, side) {
    const letter = /^[a-z]/i.test(song.title) ? song.title.charAt(0) : song.title.charAt(0);
    return `
      <div class="song-card-inner" style="--card-gradient:linear-gradient(145deg,${song.colors[0]},${song.colors[1]})">
        <div class="song-card-top"><span class="song-letter">${letter}</span><span class="heat">✦ 综合热度 ${song.popularity}</span></div>
        <div>
          <h3 class="song-card-title">${song.title}</h3>
          <p class="song-card-sub">${song.release} · 数据更新 ${song.updatedAt}</p>
          <div class="tag-row"><span class="song-tag">${song.sourceLabel}</span><span class="song-tag">${song.vocalLabel}</span><span class="song-tag">${song.mood}</span></div>
          <div class="pick-call">选择这一首 <span>${side === "a" ? "↖" : "↗"}</span></div>
        </div>
      </div>`;
  }

  function renderBattle() {
    if (!battleState || battleState.complete) {
      if (battleState?.complete) renderResult();
      return;
    }
    const pair = currentPair();
    if (!pair) return;
    const a = byId(pair.a);
    const b = byId(pair.b);
    const round = battleState.rounds[battleState.currentRound];
    els.choiceA.innerHTML = songCardMarkup(a, "a");
    els.choiceB.innerHTML = songCardMarkup(b, "b");
    els.choiceA.style.setProperty("--card-gradient", `linear-gradient(145deg,${a.colors[0]},${a.colors[1]})`);
    els.choiceB.style.setProperty("--card-gradient", `linear-gradient(145deg,${b.colors[0]},${b.colors[1]})`);
    els.roundLabel.textContent = round.size === 2 ? "THE FINAL" : `ROUND OF ${round.size}`;
    els.roundTitle.textContent = roundChinese(battleState.currentRound, round.size);
    els.progressText.textContent = `${battleState.completedMatches + 1} / ${battleState.totalMatches}`;
    els.battleProgress.style.width = `${(battleState.completedMatches / battleState.totalMatches) * 100}%`;
    els.matchReason.textContent = pair.reason;
    els.undoChoice.disabled = battleState.history.length === 0;
  }

  function chooseSong(winnerId) {
    const pair = currentPair();
    if (!pair || pair.winner) return;
    pair.winner = winnerId;
    battleState.history.push({ round: battleState.currentRound, pair: battleState.currentPair });
    battleState.completedMatches += 1;

    const round = battleState.rounds[battleState.currentRound];
    if (battleState.currentPair < round.pairs.length - 1) {
      battleState.currentPair += 1;
    } else {
      const winners = round.pairs.map((match) => match.winner);
      if (winners.length === 1) {
        battleState.complete = true;
        battleState.champion = winners[0];
        battleState.completedAt = new Date().toISOString();
      } else {
        const nextPairs = [];
        for (let i = 0; i < winners.length; i += 2) {
          nextPairs.push({
            a: winners[i],
            b: winners[i + 1],
            winner: null,
            reason: "淘汰赛晋级相遇"
          });
        }
        battleState.rounds.push({ size: winners.length, pairs: nextPairs });
        battleState.currentRound += 1;
        battleState.currentPair = 0;
      }
    }
    saveBattle();
    if (battleState.complete) {
      renderResult();
    } else {
      renderBattle();
    }
  }

  function undoChoice() {
    if (!battleState?.history.length) return;
    const last = battleState.history.pop();
    if (last.round < battleState.rounds.length - 1) battleState.rounds = battleState.rounds.slice(0, last.round + 1);
    const pair = battleState.rounds[last.round].pairs[last.pair];
    pair.winner = null;
    battleState.currentRound = last.round;
    battleState.currentPair = last.pair;
    battleState.completedMatches -= 1;
    battleState.complete = false;
    delete battleState.champion;
    delete battleState.completedAt;
    saveBattle();
    renderBattle();
    showToast("已撤回上一次选择");
  }

  function championPath() {
    if (!battleState?.champion) return [];
    return battleState.rounds.map((round, index) => {
      const match = round.pairs.find((pair) => pair.winner === battleState.champion);
      if (!match) return null;
      const opponentId = match.a === battleState.champion ? match.b : match.a;
      return { round: round.size === 2 ? "决赛" : `${round.size} 强`, opponent: byId(opponentId), index };
    }).filter(Boolean);
  }

  function getFinalFour() {
    if (!battleState) return [];
    const semi = battleState.rounds.find((round) => round.size === 4);
    if (!semi) return battleState.selectedSongIds.slice(0, 4).map(byId);
    return semi.pairs.flatMap((pair) => [byId(pair.a), byId(pair.b)]);
  }

  function renderResult() {
    if (!battleState?.complete) return;
    const champion = byId(battleState.champion);
    $("#resultMatchCount").textContent = battleState.completedMatches;
    $("#championTitle").textContent = champion.title;
    $("#championMeta").textContent = `${champion.sourceLabel} · ${champion.mood}`;
    $("#championQuote").textContent = `“${champion.quote}”`;

    const path = championPath();
    $("#championPath").innerHTML = path.map((step, index) => `
      ${index ? '<span class="path-arrow">→</span>' : ""}
      <div class="path-step"><span>${step.round}</span><b>胜 ${step.opponent.title}</b></div>
    `).join("");

    const finalFour = getFinalFour();
    $("#finalFour").innerHTML = finalFour.map((song, index) => `
      <div class="finalist ${song.id === champion.id ? "champion" : ""}">
        <span>${song.id === champion.id ? "CHAMPION" : `FINALIST 0${index + 1}`}</span>
        <b>${song.title}</b>
      </div>`).join("");
    showView("result");
    updateContinueButton();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function fillRoundRect(ctx, x, y, width, height, radius, fill) {
    roundRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let result = text;
    while (result.length && ctx.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
    return `${result}…`;
  }

  function drawPoster() {
    const canvas = els.canvas;
    const ctx = canvas.getContext("2d");
    const W = 1440;
    const H = 2400;
    canvas.width = W;
    canvas.height = H;
    const champion = byId(battleState.champion);
    const path = championPath();
    const finalFour = getFinalFour();

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#fbf8ff");
    bg.addColorStop(.52, "#f2ebff");
    bg.addColorStop(1, "#fff7fb");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(1180, 120, 0, 1180, 120, 500);
    glow.addColorStop(0, "rgba(196,181,253,.75)");
    glow.addColorStop(1, "rgba(196,181,253,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(650, 0, 790, 650);

    ctx.fillStyle = "#6d28d9";
    ctx.font = "900 24px Arial, sans-serif";
    ctx.letterSpacing = "5px";
    ctx.fillText("PURE PICK · SYC SONG BATTLE", 80, 92);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#776b82";
    ctx.font = "24px 'Microsoft YaHei', sans-serif";
    ctx.fillText("你的偏爱，没有标准答案", 80, 132);

    fillRoundRect(ctx, 80, 180, 1280, 570, 54, "#4c1d95");
    const heroGrad = ctx.createLinearGradient(80, 180, 1360, 750);
    heroGrad.addColorStop(0, "rgba(76,29,149,.1)");
    heroGrad.addColorStop(.6, "#7c3aed");
    heroGrad.addColorStop(1, "#a855f7");
    fillRoundRect(ctx, 80, 180, 1280, 570, 54, heroGrad);

    ctx.fillStyle = "#fef08a";
    ctx.font = "900 20px Arial, sans-serif";
    ctx.fillText("MY CHAMPION", 145, 255);
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.font = "24px 'Microsoft YaHei', sans-serif";
    ctx.fillText(`经过 ${battleState.completedMatches} 次心动选择，我的本命歌曲是`, 145, 310);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 76px 'Microsoft YaHei', sans-serif";
    ctx.fillText(fitText(ctx, champion.title, 700), 145, 420);
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.font = "26px 'Microsoft YaHei', sans-serif";
    ctx.fillText(`${champion.sourceLabel} · ${champion.vocalLabel} · ${champion.mood}`, 150, 475);
    ctx.font = "24px 'Microsoft YaHei', sans-serif";
    ctx.fillText(fitText(ctx, `“${champion.quote}”`, 700), 150, 560);

    // 唱片式冠军徽章
    const discX = 1110;
    const discY = 465;
    for (let r = 190; r > 0; r -= 13) {
      ctx.beginPath(); ctx.arc(discX, discY, r, 0, Math.PI * 2);
      ctx.fillStyle = r % 26 === 8 ? "#241131" : "#30133f"; ctx.fill();
    }
    const labelGrad = ctx.createLinearGradient(1015, 370, 1205, 560);
    labelGrad.addColorStop(0, "#fef08a"); labelGrad.addColorStop(1, "#f9a8d4");
    ctx.beginPath(); ctx.arc(discX, discY, 83, 0, Math.PI * 2); ctx.fillStyle = labelGrad; ctx.fill();
    ctx.fillStyle = "#3b1755"; ctx.textAlign = "center"; ctx.font = "900 20px Arial"; ctx.fillText("NO.1", discX, discY - 8);
    ctx.font = "900 25px 'Microsoft YaHei'"; ctx.fillText(fitText(ctx, champion.title, 138), discX, discY + 29);
    ctx.textAlign = "left";

    ctx.fillStyle = "#6d28d9";
    ctx.font = "900 18px Arial, sans-serif";
    ctx.fillText("FINAL FOUR", 80, 825);
    ctx.fillStyle = "#21152f";
    ctx.font = "900 34px 'Microsoft YaHei', sans-serif";
    ctx.fillText("最终四强", 80, 875);
    finalFour.forEach((song, index) => {
      const x = 80 + index * 322;
      const isChampion = song.id === champion.id;
      fillRoundRect(ctx, x, 915, 295, 132, 22, isChampion ? "#6d28d9" : "rgba(255,255,255,.82)");
      ctx.fillStyle = isChampion ? "#fef08a" : "#8b5cf6";
      ctx.font = "900 16px Arial";
      ctx.fillText(isChampion ? "CHAMPION" : `FINALIST 0${index + 1}`, x + 24, 952);
      ctx.fillStyle = isChampion ? "#fff" : "#21152f";
      ctx.font = "900 27px 'Microsoft YaHei'";
      ctx.fillText(fitText(ctx, song.title, 245), x + 24, 1005);
    });

    ctx.fillStyle = "#6d28d9";
    ctx.font = "900 18px Arial, sans-serif";
    ctx.fillText("FULL BRACKET", 80, 1120);
    ctx.fillStyle = "#21152f";
    ctx.font = "900 34px 'Microsoft YaHei', sans-serif";
    ctx.fillText("完整晋级图", 80, 1170);
    ctx.fillStyle = "#776b82";
    ctx.font = "20px 'Microsoft YaHei', sans-serif";
    ctx.fillText("每一条线，都是那一刻真实的偏爱。", 270, 1169);

    const initial = battleState.rounds[0].pairs.flatMap((pair) => [pair.a, pair.b]);
    const stages = [initial];
    battleState.rounds.forEach((round) => stages.push(round.pairs.map((pair) => pair.winner)));
    const labels = [`${battleState.poolSize}强`, ...battleState.rounds.map((round) => round.size === 2 ? "冠军" : `${round.size / 2}强`)];
    const bracketX = 80;
    const bracketY = 1240;
    const colW = 206;
    const rowGap = 34;
    const boxW = 180;
    const boxH = 27;

    stages.forEach((stage, stageIndex) => {
      const x = bracketX + stageIndex * colW;
      ctx.fillStyle = stageIndex === stages.length - 1 ? "#6d28d9" : "#7c6f86";
      ctx.font = "900 15px 'Microsoft YaHei'";
      ctx.fillText(labels[stageIndex], x, bracketY - 28);

      stage.forEach((songId, itemIndex) => {
        const yCenter = bracketY + (((2 ** stageIndex) - 1) / 2) * rowGap + itemIndex * (2 ** stageIndex) * rowGap;
        const isChamp = songId === champion.id && stageIndex === stages.length - 1;
        fillRoundRect(ctx, x, yCenter - boxH / 2, boxW, boxH, 8, isChamp ? "#6d28d9" : "rgba(255,255,255,.9)");
        ctx.fillStyle = isChamp ? "#fff" : "#35263f";
        ctx.font = `${isChamp ? "900" : "700"} 14px 'Microsoft YaHei'`;
        ctx.fillText(fitText(ctx, byId(songId).title, boxW - 20), x + 10, yCenter + 5);

        if (stageIndex > 0) {
          const previousX = x - colW + boxW;
          const prevStage = stageIndex - 1;
          const childY1 = bracketY + (((2 ** prevStage) - 1) / 2) * rowGap + (itemIndex * 2) * (2 ** prevStage) * rowGap;
          const childY2 = bracketY + (((2 ** prevStage) - 1) / 2) * rowGap + (itemIndex * 2 + 1) * (2 ** prevStage) * rowGap;
          ctx.strokeStyle = "rgba(124,58,237,.28)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(previousX, childY1);
          ctx.lineTo(previousX + 9, childY1);
          ctx.lineTo(previousX + 9, childY2);
          ctx.lineTo(x, yCenter);
          ctx.stroke();
        }
      });
    });

    ctx.fillStyle = "#7c6f86";
    ctx.font = "19px 'Microsoft YaHei'";
    ctx.fillText(`数据仅保存在本机 · 综合热度更新于 ${meta.dataUpdatedAt} · 结果生成 ${new Date().toLocaleDateString("zh-CN")}`, 80, 2340);
    ctx.textAlign = "right";
    ctx.fillStyle = "#6d28d9";
    ctx.font = "900 23px Arial";
    ctx.fillText("PURE PICK  ✦", 1360, 2340);
    ctx.textAlign = "left";

    canvas.toBlob((blob) => { posterBlob = blob; }, "image/png", .96);
  }

  function openPoster() {
    drawPoster();
    if (typeof els.posterDialog.showModal === "function") els.posterDialog.showModal();
    else els.posterDialog.setAttribute("open", "");
  }

  function downloadPoster() {
    if (!posterBlob) {
      showToast("图片仍在生成，请稍后再试");
      return;
    }
    const champion = byId(battleState.champion);
    const url = URL.createObjectURL(posterBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PURE-PICK-${champion.title}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function sharePoster() {
    if (!posterBlob) return;
    const champion = byId(battleState.champion);
    const file = new File([posterBlob], `PURE-PICK-${champion.title}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: "我的 PURE PICK", text: `我的单依纯本命歌曲是《${champion.title}》`, files: [file] });
      } catch (error) {
        if (error.name !== "AbortError") showToast("分享没有完成，可以先保存图片");
      }
    } else {
      downloadPoster();
      showToast("当前浏览器不支持直接分享，已改为保存图片");
    }
  }

  function restart() {
    clearBattle();
    showView("setup");
    updatePoolPreview();
  }

  function bindEvents() {
    $$('[data-go-home]').forEach((button) => button.addEventListener("click", () => showView("home")));
    $("#startSetup").addEventListener("click", () => showView("setup"));
    els.continueBattle.addEventListener("click", () => {
      battleState = safeLoad();
      if (!battleState) return updateContinueButton();
      if (battleState.complete) renderResult(); else { showView("battle"); renderBattle(); }
    });
    els.sizeOptions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-size]");
      if (!button) return;
      setupState.size = Number(button.dataset.size);
      $$('[data-size]', els.sizeOptions).forEach((item) => item.classList.toggle("selected", item === button));
      updatePoolPreview();
    });
    [els.sourceFilters, els.vocalFilters].forEach((container) => container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter-type]");
      if (button) toggleFilter(button);
    }));
    $$('input[name="pairing"]').forEach((input) => input.addEventListener("change", () => {
      setupState.pairing = input.value;
      $$(".radio-card").forEach((card) => card.classList.toggle("active", card.contains(input)));
    }));
    els.launchBattle.addEventListener("click", beginBattle);
    els.choiceA.addEventListener("click", () => chooseSong(currentPair()?.a));
    els.choiceB.addEventListener("click", () => chooseSong(currentPair()?.b));
    els.undoChoice.addEventListener("click", undoChoice);
    $("#pauseBattle").addEventListener("click", () => { saveBattle(); updateContinueButton(); showView("home"); });
    $("#restartBattle").addEventListener("click", restart);
    $("#makePoster").addEventListener("click", openPoster);
    $("#downloadPoster").addEventListener("click", downloadPoster);
    $("#sharePoster").addEventListener("click", sharePoster);
    $("#openAbout").addEventListener("click", () => els.aboutDialog.showModal());
    $$('[data-close-modal]').forEach((button) => button.addEventListener("click", () => els.aboutDialog.close()));
    $$('[data-close-poster]').forEach((button) => button.addEventListener("click", () => els.posterDialog.close()));
    [els.aboutDialog, els.posterDialog].forEach((dialog) => dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    }));
  }

  function init() {
    $("#songCountStat").textContent = songs.length;
    renderFilters();
    updatePoolPreview();
    updateContinueButton();
    bindEvents();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  init();
})();
