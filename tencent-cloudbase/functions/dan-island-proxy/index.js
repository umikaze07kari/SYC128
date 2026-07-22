"use strict";

const crypto = require("crypto");
const cloudbase = require("@cloudbase/node-sdk");

const app = cloudbase.init({ env: cloudbase.SYMBOL_DEFAULT_ENV });
const db = app.database();
const SUBMISSIONS = "dan_island_submissions";
const ATTEMPTS = "dan_island_attempts";
const DEVICE_SALT = "dan-island-d8gwz7m0v7cc4c765:v1";
const SCORE_BY_TIER = Object.freeze({ champion: 100, finalist: 70, top4: 45, top8: 28, top16: 16, top32: 8, top64: 4 });
const ALLOWED_BOARDS = new Set(["overall", "original", "ost", "stage"]);
const DEFAULT_ORIGIN = "https://dan-island-d8gwz7m0v7cc4c765-1422249946.tcloudbaseapp.com";
const ALLOWED_ORIGINS = new Set([DEFAULT_ORIGIN, "https://umikaze07kari.github.io", "http://localhost:8000", "http://127.0.0.1:8000"]);
let collectionsReady;

function headers(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : DEFAULT_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
}

function reply(statusCode, value, origin) {
  return { statusCode, headers: headers(origin), body: JSON.stringify(value) };
}

function publicError(message, statusCode = 400, code = "invalid-request") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicCode = code;
  return error;
}

function cleanId(value, name, max = 160, min = 8) {
  if (typeof value !== "string" || value.length < min || value.length > max || !/^[\w.-]+$/.test(value)) throw publicError(`Invalid ${name}`);
  return value;
}

function validIso(value, name) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw publicError(`Invalid ${name}`);
  return value;
}

function validateSubmission(body) {
  if (!body || ![1, 2].includes(body.schemaVersion)) throw publicError("Unsupported submission schema");
  const deviceId = cleanId(body.deviceId, "deviceId", 200);
  const journeyId = cleanId(body.journeyId, "journeyId", 200);
  const startedAt = validIso(body.startedAt, "startedAt");
  const completedAt = validIso(body.completedAt, "completedAt");
  const durationMs = Math.round(Number(body.durationMs));
  const catalogSize = Math.round(Number(body.catalogSize));
  const requestedBracketSize = Number(body.bracketSize);
  const bracketSize = body.schemaVersion === 1 ? 32 : Number.isFinite(requestedBracketSize) ? Math.round(requestedBracketSize) : body.placements?.length;
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 30 * 24 * 3600 * 1000) throw publicError("Invalid durationMs");
  if (!Number.isInteger(catalogSize) || catalogSize < 16 || catalogSize > 500) throw publicError("Invalid catalogSize");
  if (![16, 32, 64].includes(bracketSize) || bracketSize > catalogSize) throw publicError("Invalid bracketSize");
  if (!Array.isArray(body.placements) || body.placements.length !== bracketSize) throw publicError(`Exactly ${bracketSize} placements are required`);
  const seen = new Set();
  const tierCounts = {};
  const placements = body.placements.map((item) => {
    const songId = cleanId(item?.songId, "songId", 100, 1);
    if (seen.has(songId)) throw publicError("Duplicate songId");
    seen.add(songId);
    const tier = item?.tier;
    if (!(tier in SCORE_BY_TIER)) throw publicError("Invalid placement tier");
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    const rankStart = Math.round(Number(item.rankStart));
    const rankEnd = Math.round(Number(item.rankEnd));
    if (rankStart < 1 || rankEnd < rankStart || rankEnd > bracketSize) throw publicError("Invalid placement rank");
    const board = body.schemaVersion === 2 ? String(item?.board || "") : "overall";
    if (body.schemaVersion === 2 && (!ALLOWED_BOARDS.has(board) || board === "overall")) throw publicError("Invalid placement board");
    return { songId, tier, rankStart, rankEnd, points: SCORE_BY_TIER[tier], board };
  });
  const expected = { champion: 1, finalist: 1, top4: 2, top8: 4, top16: 8 };
  if (bracketSize >= 32) expected.top32 = 16;
  if (bracketSize >= 64) expected.top64 = 32;
  if (Object.entries(expected).some(([tier, count]) => tierCounts[tier] !== count)) throw publicError("Invalid placement distribution");
  const boards = body.schemaVersion === 2 && Array.isArray(body.config?.boards) ? [...new Set(body.config.boards.map(String))] : [];
  if (body.schemaVersion === 2 && (!boards.length || boards.some((board) => !ALLOWED_BOARDS.has(board) || board === "overall"))) throw publicError("Invalid board selection");
  if (body.schemaVersion === 2 && placements.some((item) => !boards.includes(item.board))) throw publicError("Placement outside selected boards");
  const events = Array.isArray(body.events) ? body.events.slice(0, 250).map((event) => ({
    kind: String(event?.kind || "").slice(0, 40),
    phase: String(event?.phase || "").slice(0, 40),
    candidates: Array.isArray(event?.candidates) ? event.candidates.slice(0, 180).filter((id) => typeof id === "string") : [],
    selected: Array.isArray(event?.selected) ? event.selected.slice(0, 20).filter((id) => typeof id === "string") : typeof event?.selected === "string" ? event.selected : null,
    elapsedMs: Math.max(0, Math.min(24 * 3600 * 1000, Math.round(Number(event?.elapsedMs) || 0))),
    journeyElapsedMs: Math.max(0, Math.min(30 * 24 * 3600 * 1000, Math.round(Number(event?.journeyElapsedMs) || 0)))
  })) : [];
  return { ...body, deviceId, journeyId, startedAt, completedAt, durationMs, catalogSize, bracketSize, config: { ...(body.config || {}), boards }, placements, events };
}

function median(numbers) {
  if (!numbers.length) return 0;
  const values = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : Math.round((values[middle - 1] + values[middle]) / 2);
}

function auditSubmission(payload) {
  const durations = payload.events.map((event) => event.elapsedMs).filter(Number.isFinite);
  const fastCount = durations.filter((value) => value < 350).length;
  const fastRatio = durations.length ? fastCount / durations.length : 1;
  const minimumDecisions = payload.bracketSize === 16 ? 20 : payload.bracketSize === 32 ? 34 : 40;
  const flags = [];
  if (payload.durationMs < 60000) flags.push("total-too-fast");
  if (durations.length < minimumDecisions) flags.push("too-few-decision-records");
  if (fastRatio > .45) flags.push("too-many-fast-decisions");
  if (durations.length && median(durations) < 350) flags.push("median-decision-too-fast");
  return { status: flags.length ? "suspect" : "valid", flags, choiceCount: durations.length, medianChoiceMs: median(durations), fastChoiceCount: fastCount };
}

function resultFingerprint(placements) {
  const tiers = ["champion", "finalist", "top4", "top8", "top16"];
  const canonical = tiers.map((tier) => `${tier}:${placements.filter((item) => item.tier === tier).map((item) => item.songId).sort().join(",")}`).join("|");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function normalizedScores(payload) {
  const rows = [];
  const add = (board, items) => {
    const total = items.reduce((sum, item) => sum + item.points, 0);
    if (!total) return false;
    const highest = Math.max(...items.map((item) => item.points));
    items.forEach((item) => rows.push({ songId: item.songId, board, points: item.points / total * 1000, top1: item.points === highest ? 1 : 0 }));
    return true;
  };
  const scopes = ["overall"];
  add("overall", payload.placements);
  payload.config.boards.forEach((board) => { if (add(board, payload.placements.filter((item) => item.board === board))) scopes.push(board); });
  return { scopes, rows };
}

async function ensureCollections() {
  if (!collectionsReady) collectionsReady = Promise.all([SUBMISSIONS, ATTEMPTS].map(async (name) => {
    try { await db.createCollection(name); } catch (error) {
      if (!/exist|already|duplicate/i.test(`${error.code || ""} ${error.message || ""}`)) throw error;
    }
  }));
  return collectionsReady;
}

async function allDocuments(collectionName) {
  const result = [];
  for (let offset = 0; ; offset += 100) {
    const page = await db.collection(collectionName).skip(offset).limit(100).get();
    const items = page.data || [];
    result.push(...items);
    if (items.length < 100) return result;
  }
}

async function submit(body) {
  const payload = validateSubmission(body);
  const deviceKey = crypto.createHash("sha256").update(`${DEVICE_SALT}:${payload.deviceId}`).digest("hex");
  const existingResult = await db.collection(SUBMISSIONS).doc(deviceKey).get();
  const existing = existingResult.data?.[0];
  const audit = auditSubmission(payload);
  const scoreData = normalizedScores(payload);
  const now = new Date().toISOString();
  const record = {
    deviceKey,
    resultFingerprint: resultFingerprint(payload.placements),
    journeyId: payload.journeyId,
    startedAt: payload.startedAt,
    completedAt: payload.completedAt,
    durationMs: payload.durationMs,
    catalogSize: payload.catalogSize,
    bracketSize: payload.bracketSize,
    choiceCount: audit.choiceCount,
    medianChoiceMs: audit.medianChoiceMs,
    fastChoiceCount: audit.fastChoiceCount,
    autoStatus: audit.status,
    autoFlags: audit.flags,
    reviewStatus: existing?.reviewStatus || null,
    moderatorNote: existing?.moderatorNote || "",
    payload: { ...payload, deviceId: undefined },
    scopes: scoreData.scopes,
    scores: scoreData.rows,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  await db.collection(SUBMISSIONS).doc(deviceKey).set(record);
  await db.collection(ATTEMPTS).add({ deviceKey, journeyId: payload.journeyId, durationMs: payload.durationMs, autoStatus: audit.status, autoFlags: audit.flags, createdAt: now });
  return { ok: true, submissionId: deviceKey.slice(0, 12), replaced: Boolean(existing), reviewStatus: audit.status };
}

async function leaderboard(board) {
  if (!ALLOWED_BOARDS.has(board)) throw publicError("Invalid leaderboard board");
  const submissions = await allDocuments(SUBMISSIONS);
  const valid = submissions.filter((item) => item.reviewStatus === "valid" || (!item.reviewStatus && item.autoStatus === "valid"));
  const pendingReview = submissions.filter((item) => !item.reviewStatus && item.autoStatus === "suspect").length;
  const eligible = valid.filter((item) => (item.scopes || []).includes(board));
  const totals = new Map();
  eligible.forEach((item) => (item.scores || []).filter((score) => score.board === board).forEach((score) => {
    const row = totals.get(score.songId) || { songId: score.songId, points: 0, top1Count: 0, supportCount: 0 };
    row.points += Number(score.points) || 0;
    row.top1Count += Number(score.top1) || 0;
    row.supportCount += 1;
    totals.set(score.songId, row);
  }));
  const entries = [...totals.values()].map((row) => ({ ...row, score: eligible.length ? Math.round(row.points / eligible.length) / 10 : 0 }))
    .sort((a, b) => b.score - a.score || b.top1Count - a.top1Count || b.supportCount - a.supportCount || a.songId.localeCompare(b.songId))
    .slice(0, 50).map((row, index) => ({ rank: index + 1, songId: row.songId, score: row.score, top1Count: row.top1Count, supportCount: row.supportCount }));
  return { board, entries, eligibleSubmissions: eligible.length, validSubmissions: valid.length, pendingReview, generatedAt: new Date().toISOString() };
}

exports.main = async (event = {}, context = {}) => {
  const requestHeaders = event.headers || context.httpContext?.headers || {};
  const origin = requestHeaders.origin || requestHeaders.Origin || "";
  const method = String(event.httpMethod || context.httpContext?.httpMethod || event.method || "GET").toUpperCase();
  if (method === "OPTIONS") return { statusCode: 204, headers: headers(origin), body: "" };
  let pathname = event.path || new URL(context.httpContext?.url || "/", "https://cloudbase.local").pathname;
  if (!pathname.startsWith("/api/")) pathname = `/api/${pathname.replace(/^\/+/, "")}`;
  const query = event.queryStringParameters || Object.fromEntries(new URL(context.httpContext?.url || "/", "https://cloudbase.local").searchParams);
  try {
    await ensureCollections();
    if (method === "GET" && pathname === "/api/health") return reply(200, { ok: true, service: "dan-island-ranking-api-cn", checks: { function: { ok: true }, database: { ok: true }, schema: { ok: true, missingTables: [] } }, generatedAt: new Date().toISOString() }, origin);
    if (method === "GET" && pathname === "/api/leaderboard") return reply(200, await leaderboard(query.board || "overall"), origin);
    if (method === "POST" && pathname === "/api/submissions") {
      const rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body;
      const body = typeof rawBody === "string" ? JSON.parse(rawBody || "{}") : rawBody || {};
      return reply(200, await submit(body), origin);
    }
    return reply(404, { error: "Not found" }, origin);
  } catch (error) {
    console.error("Dan Island API error", { method, pathname, code: error.code, message: error.message });
    const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
    return reply(statusCode, { error: statusCode < 500 ? error.message : "Internal server error", code: error.publicCode || (statusCode < 500 ? "invalid-request" : "internal-error") }, origin);
  }
};
