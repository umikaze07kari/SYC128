"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ENV_ID = "dan-island-d8gwz7m0v7cc4c765";
const SUBMISSIONS = "dan_island_submissions";
const DEVICE_SALT = "dan-island-d8gwz7m0v7cc4c765:v1";
const MANIFEST = path.join(__dirname, "result-image-imports.json");
const APPLY = process.argv.includes("--apply");
const SCORE = { champion: 100, finalist: 70, top4: 45, top8: 28, top16: 16, top32: 8, top64: 4 };

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024, windowsHide: true, ...options });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})\n${result.stderr || result.stdout}`);
  return result.stdout;
}

function parseJsonOutput(output) {
  const starts = [output.indexOf("["), output.indexOf("{")].filter((index) => index >= 0);
  const start = Math.min(...starts);
  const end = Math.max(output.lastIndexOf("]"), output.lastIndexOf("}"));
  if (!Number.isFinite(start) || end < start) throw new Error("CLI did not return JSON");
  return JSON.parse(output.slice(start, end + 1));
}

function loadCatalog() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "songs.js"), "utf8"), sandbox, { filename: "songs.js" });
  return sandbox.window.SONG_CATALOG;
}

const catalog = loadCatalog();
const byId = new Map(catalog.map((song) => [song.id, song]));
const byTitle = new Map();
for (const song of catalog) {
  const key = song.title.trim().toLocaleLowerCase("zh-CN");
  if (byTitle.has(key)) throw new Error(`Duplicate catalog title: ${song.title}`);
  byTitle.set(key, song);
}

function resolveSong(value) {
  const song = byId.get(value) || byTitle.get(String(value).trim().toLocaleLowerCase("zh-CN"));
  if (!song) throw new Error(`Unknown song in import manifest: ${value}`);
  return song;
}

function boardForSong(song) {
  if (["album", "single"].includes(song.source)) return "original";
  if (song.source === "ost") return "ost";
  return "stage";
}

function verifyStages(item) {
  const stages = [["top16", 16], ["top8", 8], ["top4", 4], ["top2", 2]];
  const resolved = {};
  for (const [name, count] of stages) {
    resolved[name] = item[name].map((title) => resolveSong(title).id);
    if (resolved[name].length !== count || new Set(resolved[name]).size !== count) throw new Error(`${item.file}: ${name} must contain ${count} unique songs`);
  }
  for (let index = 1; index < stages.length; index += 1) {
    const previous = new Set(resolved[stages[index - 1][0]]);
    const unexpected = resolved[stages[index][0]].filter((id) => !previous.has(id));
    if (unexpected.length) throw new Error(`${item.file}: ${stages[index][0]} contains songs outside previous stage: ${unexpected.join(",")}`);
  }
  const champion = resolveSong(item.champion).id;
  if (!resolved.top2.includes(champion)) throw new Error(`${item.file}: champion is outside top2`);
  return { ...resolved, champion };
}

function placementsFromStages(stages) {
  const groups = [
    ["champion", [stages.champion]],
    ["finalist", stages.top2.filter((id) => id !== stages.champion)],
    ["top4", stages.top4.filter((id) => !stages.top2.includes(id))],
    ["top8", stages.top8.filter((id) => !stages.top4.includes(id))],
    ["top16", stages.top16.filter((id) => !stages.top8.includes(id))]
  ];
  let rank = 1;
  return groups.flatMap(([tier, ids]) => {
    const rankStart = rank;
    const rankEnd = rank + ids.length - 1;
    rank = rankEnd + 1;
    return ids.map((songId) => ({ songId, tier, rankStart, rankEnd, points: SCORE[tier], board: boardForSong(byId.get(songId)) }));
  });
}

function fingerprint(placements) {
  const tiers = ["champion", "finalist", "top4", "top8", "top16"];
  const canonical = tiers.map((tier) => `${tier}:${placements.filter((row) => row.tier === tier).map((row) => row.songId).sort().join(",")}`).join("|");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function scoreData(payload) {
  const rows = [];
  const add = (board, items) => {
    const total = items.reduce((sum, item) => sum + SCORE[item.tier], 0);
    if (!total) return false;
    const highest = Math.max(...items.map((item) => SCORE[item.tier]));
    for (const item of items) rows.push({ songId: item.songId, board, points: SCORE[item.tier] / total * 1000, top1: SCORE[item.tier] === highest ? 1 : 0 });
    return true;
  };
  const scopes = ["overall"];
  add("overall", payload.placements);
  for (const board of payload.config.boards) if (add(board, payload.placements.filter((item) => item.board === board))) scopes.push(board);
  return { scopes, rows };
}

function recordFromPayload(payload, source, timestamps = {}) {
  const resultFingerprint = fingerprint(payload.placements);
  const scores = scoreData(payload);
  const now = timestamps.updatedAt || new Date().toISOString();
  return {
    _id: resultFingerprint,
    resultFingerprint,
    deviceKey: source.deviceKey || `offline-${resultFingerprint}`,
    journeyId: payload.journeyId,
    startedAt: payload.startedAt,
    completedAt: payload.completedAt,
    durationMs: payload.durationMs,
    catalogSize: payload.catalogSize,
    bracketSize: payload.bracketSize,
    choiceCount: Array.isArray(payload.events) ? payload.events.length : 0,
    medianChoiceMs: 0,
    fastChoiceCount: 0,
    autoStatus: source.autoStatus || "suspect",
    autoFlags: source.autoFlags || ["offline-import"],
    reviewStatus: source.reviewStatus ?? "valid",
    moderatorNote: source.note || "Offline import",
    payload: { ...payload, deviceId: undefined },
    scopes: scores.scopes,
    scores: scores.rows,
    importSource: source.kind,
    importFile: source.file || null,
    createdAt: timestamps.createdAt || now,
    updatedAt: now
  };
}

function cloudflareRecords() {
  const sql = "SELECT s.device_key,s.auto_status,s.review_status,s.moderator_note,s.created_at,s.updated_at,s.payload_json FROM submissions s ORDER BY s.id";
  const output = run("npx.cmd", ["--yes", "--package=node@22", "--package=wrangler@latest", "wrangler", "d1", "execute", "dan-island-ranking", "--remote", "--command", sql, "--json"], { cwd: path.join(ROOT, "cloudflare") });
  const parsed = parseJsonOutput(output);
  const rows = parsed[0]?.results || [];
  return rows.map((row) => {
    const payload = JSON.parse(row.payload_json);
    return recordFromPayload(payload, {
      kind: "cloudflare-d1",
      deviceKey: row.device_key,
      autoStatus: row.auto_status,
      reviewStatus: row.review_status,
      note: row.moderator_note || "Migrated from Cloudflare D1"
    }, { createdAt: `${row.created_at.replace(" ", "T")}Z`, updatedAt: `${row.updated_at.replace(" ", "T")}Z` });
  });
}

function imageRecords() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  return manifest.map((item) => {
    const stages = verifyStages(item);
    const placements = placementsFromStages(stages);
    const stamp = item.file.match(/_(\d{8})(\d{6})_/);
    const completedAt = stamp ? `${stamp[1].slice(0, 4)}-${stamp[1].slice(4, 6)}-${stamp[1].slice(6, 8)}T${stamp[2].slice(0, 2)}:${stamp[2].slice(2, 4)}:${stamp[2].slice(4, 6)}+08:00` : new Date().toISOString();
    const boards = [...new Set(placements.map((row) => row.board))];
    const payload = {
      schemaVersion: 2,
      clientVersion: 15,
      journeyId: `image-${crypto.createHash("sha256").update(item.file).digest("hex").slice(0, 24)}`,
      startedAt: completedAt,
      completedAt,
      durationMs: 0,
      catalogSize: item.catalogSize,
      bracketSize: 16,
      config: { includeCollabs: true, boards, stageCollections: [], importOriginalBracket: item.catalogSize >= 64 ? 64 : item.catalogSize >= 32 ? 32 : 16 },
      placements,
      events: []
    };
    return recordFromPayload(payload, { kind: "verified-result-image", file: item.file, note: `人工核验结果图补录：${item.file}；按图中 Top 16 至冠军计榜。` }, { createdAt: completedAt, updatedAt: completedAt });
  });
}

function existingFingerprints() {
  const command = [{ TableName: SUBMISSIONS, CommandType: "QUERY", Command: JSON.stringify({ find: SUBMISSIONS, filter: {}, projection: { resultFingerprint: 1 }, limit: 100 }) }];
  const output = run("npx.cmd", ["--yes", "--package=node@22", "--package=@cloudbase/cli@latest", "tcb", "db", "nosql", "execute", "-e", ENV_ID, "--command", JSON.stringify(command), "--json"]);
  const parsed = parseJsonOutput(output);
  return new Set((parsed.data?.results?.[0] || []).map((row) => row.resultFingerprint).filter(Boolean));
}

function upsert(records) {
  const patches = [];
  for (const record of records) {
    const isCloudflare = record.importSource === "cloudflare-d1";
    const deviceId = isCloudflare ? `cloudflare-${record.deviceKey.slice(0, 64)}` : `offline-${record.resultFingerprint}`;
    const payload = { ...record.payload, deviceId };
    const output = run("curl.exe", ["-sS", "-f", "-X", "POST", "https://dan-island-d8gwz7m0v7cc4c765.service.tcloudbase.com/api/submissions", "-H", "Content-Type: application/json", "--data-binary", JSON.stringify(payload)]);
    const response = JSON.parse(output);
    if (!response.ok) throw new Error(`Cloudflare migration API rejected ${record.journeyId}`);
    if (!isCloudflare) {
      const documentId = crypto.createHash("sha256").update(`${DEVICE_SALT}:${deviceId}`).digest("hex");
      patches.push({ q: { _id: documentId }, u: { $set: { reviewStatus: "valid", moderatorNote: record.moderatorNote, importSource: record.importSource, importFile: record.importFile } }, upsert: false, multi: false });
    }
  }
  for (let offset = 0; offset < patches.length; offset += 4) {
    const command = [{ TableName: SUBMISSIONS, CommandType: "UPDATE", Command: JSON.stringify({ update: SUBMISSIONS, updates: patches.slice(offset, offset + 4) }) }];
    run("npx.cmd", ["--yes", "--package=node@22", "--package=@cloudbase/cli@latest", "tcb", "db", "nosql", "execute", "-e", ENV_ID, "--command", JSON.stringify(command), "--json"]);
  }
}

const candidates = [...cloudflareRecords(), ...imageRecords()];
const unique = new Map();
const duplicates = [];
for (const record of candidates) {
  if (unique.has(record.resultFingerprint)) {
    duplicates.push({ skipped: record.importFile || record.importSource, kept: unique.get(record.resultFingerprint).importFile || unique.get(record.resultFingerprint).importSource, champion: record.payload.placements.find((row) => row.tier === "champion").songId });
    continue;
  }
  unique.set(record.resultFingerprint, record);
}

const uniqueRecords = [...unique.values()];
const existing = existingFingerprints();
const records = uniqueRecords.filter((record) => !existing.has(record.resultFingerprint));
console.log(JSON.stringify({ apply: APPLY, candidates: candidates.length, unique: uniqueRecords.length, alreadyPresent: uniqueRecords.length - records.length, toImport: records.length, duplicates, champions: records.map((record) => record.payload.placements.find((row) => row.tier === "champion").songId) }, null, 2));
if (!APPLY) {
  console.log("Dry run only. Re-run with --apply to write CloudBase.");
  process.exit(0);
}
upsert(records);
console.log(`Imported ${records.length} new unique records into ${SUBMISSIONS}.`);
