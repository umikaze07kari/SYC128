(() => {
  "use strict";

  const PHASE_WEIGHTS = {
    landing: 0.8,
    "landing-tiebreak": 1.15,
    revival: 1.1,
    "top8-revival-pick": 1.5,
    duel64: 1.2,
    duel32: 1.45,
    duel16: 1.8,
    duel8Revival: 2,
    duel8: 2.35,
    duel4: 3,
    final: 4
  };

  const THEME_WORDS = {
    爱与关系: ["爱", "心", "情", "你", "我", "我们", "拥抱", "恋"],
    夜与梦境: ["夜", "月", "梦", "星", "天空", "银河"],
    时间与回忆: ["时", "年", "曾经", "从前", "记", "照片", "往事"],
    远方与自由: ["风", "远", "路", "海", "山", "飞", "自由", "世界"],
    告别与遗憾: ["再见", "离开", "失去", "遗憾", "忘", "孤独"],
    勇气与生长: ["勇敢", "光", "太阳", "花", "未来", "快乐"]
  };

  function addFeature(target, key, weight) {
    target[key] = (target[key] || 0) + weight;
  }

  function releaseKind(release = "") {
    if (release.includes("专辑")) return "album";
    if (release.includes("综艺")) return "variety";
    if (release.includes("演唱会")) return "concert";
    if (release.includes("晚会")) return "gala";
    if (release.includes("电影")) return "movie";
    if (release.includes("电视剧") || release.includes("网络剧")) return "series";
    if (release.includes("游戏")) return "game";
    return "single";
  }

  function metadataVector(song) {
    const vector = {};
    addFeature(vector, `mood:${song.mood}`, 2.6);
    addFeature(vector, `source:${song.source}`, 1.15);
    addFeature(vector, `vocal:${song.vocal}`, 0.35);
    addFeature(vector, `release:${releaseKind(song.release)}`, 0.9);
    const text = `${song.title} ${song.lyricExcerpt || ""}`;
    Object.entries(THEME_WORDS).forEach(([theme, words]) => {
      const hits = words.filter((word) => text.includes(word)).length;
      if (hits) addFeature(vector, `theme:${theme}`, Math.min(1.2, 0.45 + hits * 0.2));
    });
    return vector;
  }

  function sparseCosine(left, right) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    keys.forEach((key) => {
      const a = left[key] || 0;
      const b = right[key] || 0;
      dot += a * b;
      leftNorm += a * a;
      rightNorm += b * b;
    });
    return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
  }

  function denseCosine(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || !left.length || left.length !== right.length) return null;
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < left.length; index += 1) {
      dot += left[index] * right[index];
      leftNorm += left[index] ** 2;
      rightNorm += right[index] ** 2;
    }
    return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : null;
  }

  function externalVector(song, kind) {
    return globalThis.SONG_VECTOR_DATA?.[song.id]?.[kind] || song.vectors?.[kind] || null;
  }

  function songSimilarity(left, right) {
    const metadata = sparseCosine(metadataVector(left), metadataVector(right));
    const audio = denseCosine(externalVector(left, "audio"), externalVector(right, "audio"));
    const lyrics = denseCosine(externalVector(left, "lyrics"), externalVector(right, "lyrics"));
    const acoustic = denseCosine(externalVector(left, "features"), externalVector(right, "features"));
    const parts = [[metadata, 0.25], [audio, 0.45], [lyrics, 0.2], [acoustic, 0.1]].filter(([value]) => value !== null);
    const totalWeight = parts.reduce((sum, [, weight]) => sum + weight, 0);
    return parts.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight;
  }

  function addSignal(map, id, weight) {
    if (id) map.set(id, (map.get(id) || 0) + weight);
  }

  function buildSignals(state) {
    const positive = new Map();
    const negative = new Map();
    const unfamiliar = new Set();
    (state.auditEvents || []).forEach((event) => {
      const phaseWeight = PHASE_WEIGHTS[event.phase] || PHASE_WEIGHTS[event.kind] || 1;
      const selected = new Set(Array.isArray(event.selected) ? event.selected : event.selected ? [event.selected] : []);
      if (!selected.size && event.kind === "landing") event.candidates.forEach((id) => unfamiliar.add(id));
      selected.forEach((id) => addSignal(positive, id, phaseWeight));
      (event.candidates || []).filter((id) => !selected.has(id)).forEach((id) => {
        const softLoss = ["landing", "revival"].includes(event.kind) ? 0.12 : 0.28;
        addSignal(negative, id, phaseWeight * softLoss);
      });
    });
    const placementWeights = [
      [state.champion ? [state.champion] : [], 7],
      [state.top2 || [], 4.5],
      [state.top4 || [], 2.6],
      [state.top8 || [], 1.4],
      [state.top16 || [], 0.7]
    ];
    placementWeights.forEach(([ids, weight]) => ids.forEach((id) => addSignal(positive, id, weight)));
    return { positive, negative, unfamiliar };
  }

  function weightedAffinity(candidate, signals, songById) {
    let positiveTotal = 0;
    let positiveWeight = 0;
    let closest = null;
    let closestScore = -1;
    signals.positive.forEach((weight, id) => {
      const song = songById.get(id);
      if (!song || song.id === candidate.id) return;
      const similarity = songSimilarity(candidate, song);
      positiveTotal += similarity * weight;
      positiveWeight += weight;
      if (similarity * Math.log2(weight + 2) > closestScore) {
        closestScore = similarity * Math.log2(weight + 2);
        closest = song;
      }
    });
    const positiveAffinity = positiveWeight ? positiveTotal / positiveWeight : 0;
    const directLoss = signals.negative.get(candidate.id) || 0;
    const novelty = Math.max(0, Math.min(1, (82 - Number(candidate.seedScore || 60)) / 42));
    const unfamiliarBonus = signals.unfamiliar.has(candidate.id) ? 0.09 : 0;
    return {
      score: positiveAffinity * 0.72 + novelty * 0.2 + unfamiliarBonus - Math.min(0.16, directLoss * 0.025),
      closest,
      novelty
    };
  }

  function discoveryLabel(novelty) {
    if (novelty >= 0.68) return "深海遗珠";
    if (novelty >= 0.35) return "低调宝藏";
    return "偏航发现";
  }

  function reasonFor(song, closest) {
    const shared = [];
    if (closest?.mood === song.mood) shared.push(`${song.mood}气质`);
    if (closest?.source === song.source) shared.push(song.sourceLabel);
    const bridge = shared.length ? shared.slice(0, 2).join("与") : `${song.mood}的声音颜色`;
    return closest
      ? `你对《${closest.title}》留下的偏爱，也指向了这首歌的${bridge}。`
      : `从你一路留下的选择看，这首歌的${bridge}值得再听一次。`;
  }

  function recommend(catalog, state, options = {}) {
    const songById = new Map(catalog.map((song) => [song.id, song]));
    const signals = buildSignals(state);
    const excluded = new Set([
      ...(state.top16 || []),
      ...(state.discovery?.heardIds || []),
      ...(state.discovery?.dislikedIds || []),
      ...(options.excludeIds || [])
    ]);
    signals.positive.forEach((_, id) => excluded.add(id));
    const ranked = catalog
      .filter((song) => !excluded.has(song.id))
      .map((song) => ({ song, ...weightedAffinity(song, signals, songById) }))
      .sort((a, b) => b.score - a.score || a.song.seedScore - b.song.seedScore || a.song.id.localeCompare(b.song.id));

    const selected = [];
    while (ranked.length && selected.length < (options.limit || 3)) {
      ranked.forEach((entry) => {
        const similarityPenalty = selected.length ? Math.max(...selected.map((picked) => songSimilarity(entry.song, picked.song))) * 0.13 : 0;
        const sameReleasePenalty = selected.some((picked) => picked.song.release === entry.song.release) ? 0.1 : 0;
        entry.diverseScore = entry.score - similarityPenalty - sameReleasePenalty;
      });
      ranked.sort((a, b) => b.diverseScore - a.diverseScore || b.score - a.score);
      selected.push(ranked.shift());
    }
    return selected.map((entry) => ({
      id: entry.song.id,
      score: entry.score,
      label: discoveryLabel(entry.novelty),
      anchorId: entry.closest?.id || null,
      reason: reasonFor(entry.song, entry.closest)
    }));
  }

  function describe(catalog, state, ids) {
    const songById = new Map(catalog.map((song) => [song.id, song]));
    const signals = buildSignals(state);
    return ids.map((id) => {
      const song = songById.get(id);
      if (!song) return null;
      const entry = weightedAffinity(song, signals, songById);
      return {
        id,
        score: entry.score,
        label: discoveryLabel(entry.novelty),
        anchorId: entry.closest?.id || null,
        reason: reasonFor(song, entry.closest)
      };
    }).filter(Boolean);
  }

  function profile(catalog, state) {
    const songById = new Map(catalog.map((song) => [song.id, song]));
    const signals = buildSignals(state);
    const moods = new Map();
    signals.positive.forEach((weight, id) => {
      const mood = songById.get(id)?.mood;
      if (mood) moods.set(mood, (moods.get(mood) || 0) + weight);
    });
    return [...moods.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([mood]) => mood);
  }

  globalThis.DAN_ISLAND_RECOMMENDER = { recommend, describe, profile, songSimilarity, metadataVector };
})();
