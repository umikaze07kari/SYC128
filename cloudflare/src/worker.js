const SCORE_BY_TIER = Object.freeze({
  champion: 100,
  finalist: 70,
  top4: 45,
  top8: 28,
  top16: 16,
  top32: 8,
  top64: 4
});
const ALLOWED_BOARDS = new Set(["overall", "original", "ost", "stage"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    try {
      let response;
      if (request.method === "POST" && url.pathname === "/api/submissions") response = await submit(request, env);
      else if (request.method === "GET" && url.pathname === "/api/health") response = await health(env);
      else if (request.method === "GET" && url.pathname === "/api/leaderboard") response = await leaderboard(env, url.searchParams.get("board") || "overall");
      else if (url.pathname === "/api/admin/submissions" && request.method === "GET") response = await adminList(request, env);
      else if (/^\/api\/admin\/submissions\/\d+$/.test(url.pathname) && request.method === "GET") response = await adminDetail(request, env, Number(url.pathname.split("/").pop()));
      else if (/^\/api\/admin\/submissions\/\d+$/.test(url.pathname) && request.method === "PATCH") response = await adminUpdate(request, env, Number(url.pathname.split("/").pop()));
      else response = json({ error: "Not found" }, 404);
      Object.entries(cors).forEach(([key, value]) => response.headers.set(key, value));
      return response;
    } catch (error) {
      console.error(error);
      const response = json({ error: error instanceof PublicError ? error.message : "Internal server error" }, error instanceof PublicError ? error.status : 500);
      Object.entries(cors).forEach(([key, value]) => response.headers.set(key, value));
      return response;
    }
  }
};

class PublicError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function json(value, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
  const allowOrigin = !allowed.length ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

async function readJson(request, maxBytes = 220000) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > maxBytes) throw new PublicError("Payload too large", 413);
  const text = await request.text();
  if (text.length > maxBytes) throw new PublicError("Payload too large", 413);
  try { return JSON.parse(text); } catch { throw new PublicError("Invalid JSON"); }
}

function cleanId(value, name, max = 160, min = 8) {
  if (typeof value !== "string" || value.length < min || value.length > max || !/^[\w.-]+$/.test(value)) {
    throw new PublicError(`Invalid ${name}`);
  }
  return value;
}

function validIso(value, name) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new PublicError(`Invalid ${name}`);
  return value;
}

function validateSubmission(body) {
  if (!body || ![1, 2].includes(body.schemaVersion)) throw new PublicError("Unsupported submission schema");
  const deviceId = cleanId(body.deviceId, "deviceId", 200);
  const journeyId = cleanId(body.journeyId, "journeyId", 200);
  const startedAt = validIso(body.startedAt, "startedAt");
  const completedAt = validIso(body.completedAt, "completedAt");
  const durationMs = Math.round(Number(body.durationMs));
  const catalogSize = Math.round(Number(body.catalogSize));
  const requestedBracketSize = Number(body.bracketSize);
  const bracketSize = body.schemaVersion === 1 ? 32 : Number.isFinite(requestedBracketSize) ? Math.round(requestedBracketSize) : body.placements?.length;
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 30 * 24 * 3600 * 1000) throw new PublicError("Invalid durationMs");
  if (!Number.isInteger(catalogSize) || catalogSize < 16 || catalogSize > 500) throw new PublicError("Invalid catalogSize");
  if (![16, 32, 64].includes(bracketSize) || bracketSize > catalogSize) throw new PublicError("Invalid bracketSize");
  if (!Array.isArray(body.placements) || body.placements.length !== bracketSize) throw new PublicError(`Exactly ${bracketSize} placements are required`);

  const seen = new Set();
  const tierCounts = {};
  const placements = body.placements.map((item) => {
    const songId = cleanId(item?.songId, "songId", 100, 1);
    if (seen.has(songId)) throw new PublicError("Duplicate songId");
    seen.add(songId);
    const tier = item?.tier;
    if (!(tier in SCORE_BY_TIER)) throw new PublicError("Invalid placement tier");
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    const rankStart = Math.round(Number(item.rankStart));
    const rankEnd = Math.round(Number(item.rankEnd));
    if (rankStart < 1 || rankEnd < rankStart || rankEnd > bracketSize) throw new PublicError("Invalid placement rank");
    const board = body.schemaVersion === 2 ? String(item?.board || "") : "overall";
    if (body.schemaVersion === 2 && (!ALLOWED_BOARDS.has(board) || board === "overall")) throw new PublicError("Invalid placement board");
    return { songId, tier, rankStart, rankEnd, points: SCORE_BY_TIER[tier], board };
  });
  const expected = { champion: 1, finalist: 1, top4: 2, top8: 4, top16: 8 };
  if (bracketSize >= 32) expected.top32 = 16;
  if (bracketSize >= 64) expected.top64 = 32;
  if (Object.entries(expected).some(([tier, count]) => tierCounts[tier] !== count)) throw new PublicError("Invalid placement distribution");

  const events = Array.isArray(body.events) ? body.events.slice(0, 250).map((event) => ({
    kind: String(event?.kind || "").slice(0, 40),
    phase: String(event?.phase || "").slice(0, 40),
    candidates: Array.isArray(event?.candidates) ? event.candidates.slice(0, 180).filter((id) => typeof id === "string") : [],
    selected: Array.isArray(event?.selected) ? event.selected.slice(0, 20).filter((id) => typeof id === "string") : typeof event?.selected === "string" ? event.selected : null,
    elapsedMs: Math.max(0, Math.min(24 * 3600 * 1000, Math.round(Number(event?.elapsedMs) || 0))),
    journeyElapsedMs: Math.max(0, Math.min(30 * 24 * 3600 * 1000, Math.round(Number(event?.journeyElapsedMs) || 0)))
  })) : [];
  const requestedBoards = body.schemaVersion === 2 && Array.isArray(body.config?.boards) ? body.config.boards : [];
  const boards = [...new Set(requestedBoards.map(String))];
  if (boards.some((board) => !ALLOWED_BOARDS.has(board) || board === "overall")) throw new PublicError("Invalid board selection");
  if (body.schemaVersion === 2 && !boards.length) throw new PublicError("At least one board is required");
  if (body.schemaVersion === 2 && placements.some((item) => !boards.includes(item.board))) throw new PublicError("Placement outside selected boards");
  return { ...body, deviceId, journeyId, startedAt, completedAt, durationMs, catalogSize, bracketSize, config: { ...(body.config || {}), boards }, placements, events };
}

function normalizedScoreRows(payload) {
  const scopes = ["overall"];
  const rows = [];
  const addScope = (board, items) => {
    const total = items.reduce((sum, item) => sum + item.points, 0);
    if (!total) return false;
    const highest = Math.max(...items.map((item) => item.points));
    items.forEach((item) => rows.push({
      songId: item.songId,
      board,
      points: item.points / total * 1000,
      top1: item.points === highest ? 1 : 0
    }));
    return true;
  };
  addScope("overall", payload.placements);
  (payload.config?.boards || []).forEach((board) => {
    if (addScope(board, payload.placements.filter((item) => item.board === board))) scopes.push(board);
  });
  return { scopes, rows };
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function median(numbers) {
  if (!numbers.length) return 0;
  const values = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : Math.round((values[middle - 1] + values[middle]) / 2);
}

function auditSubmission(payload, env) {
  const durations = payload.events.map((event) => event.elapsedMs).filter(Number.isFinite);
  const fastThreshold = Number(env.FAST_DECISION_MS || 350);
  const fastCount = durations.filter((value) => value < fastThreshold).length;
  const fastRatio = durations.length ? fastCount / durations.length : 1;
  const configuredMinimum = Number(env.MIN_DECISIONS || 40);
  const bracketMinimum = payload.bracketSize === 16 ? 20 : payload.bracketSize === 32 ? 34 : 40;
  const minimumDecisions = Math.min(configuredMinimum, bracketMinimum);
  const flags = [];
  if (payload.durationMs < Number(env.MIN_DURATION_MS || 60000)) flags.push("total-too-fast");
  if (durations.length < minimumDecisions) flags.push("too-few-decision-records");
  if (fastRatio > Number(env.MAX_FAST_RATIO || .45)) flags.push("too-many-fast-decisions");
  if (durations.length && median(durations) < fastThreshold) flags.push("median-decision-too-fast");
  return { status: flags.length ? "suspect" : "valid", flags, choiceCount: durations.length, medianChoiceMs: median(durations), fastChoiceCount: fastCount };
}

async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function submit(request, env) {
  const payload = validateSubmission(await readJson(request));
  if (!env.DEVICE_SALT) throw new Error("DEVICE_SALT secret is not configured");
  const deviceKey = await sha256(`${env.DEVICE_SALT}:${payload.deviceId}`);
  const audit = auditSubmission(payload, env);
  const storedPayload = JSON.stringify({ ...payload, deviceId: undefined });
  const flagsJson = JSON.stringify(audit.flags);
  const existing = await env.DB.prepare("SELECT id FROM submissions WHERE device_key = ?").bind(deviceKey).first();

  let submissionId;
  if (existing) {
    submissionId = existing.id;
    await env.DB.prepare(`UPDATE submissions SET journey_id=?, started_at=?, completed_at=?, duration_ms=?, catalog_size=?, choice_count=?, median_choice_ms=?, fast_choice_count=?, auto_status=?, auto_flags=?, review_status=NULL, moderator_note='', payload_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(payload.journeyId, payload.startedAt, payload.completedAt, payload.durationMs, payload.catalogSize, audit.choiceCount, audit.medianChoiceMs, audit.fastChoiceCount, audit.status, flagsJson, storedPayload, submissionId).run();
  } else {
    const inserted = await env.DB.prepare(`INSERT INTO submissions (device_key, journey_id, started_at, completed_at, duration_ms, catalog_size, choice_count, median_choice_ms, fast_choice_count, auto_status, auto_flags, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(deviceKey, payload.journeyId, payload.startedAt, payload.completedAt, payload.durationMs, payload.catalogSize, audit.choiceCount, audit.medianChoiceMs, audit.fastChoiceCount, audit.status, flagsJson, storedPayload).run();
    submissionId = inserted.meta.last_row_id;
  }

  await env.DB.prepare(`INSERT INTO submission_attempts (submission_id, device_key, journey_id, duration_ms, auto_status, auto_flags, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(submissionId, deviceKey, payload.journeyId, payload.durationMs, audit.status, flagsJson, storedPayload).run();

  const scoreData = normalizedScoreRows(payload);
  const statements = [
    env.DB.prepare("DELETE FROM submission_items WHERE submission_id = ?").bind(submissionId),
    env.DB.prepare("DELETE FROM submission_scores WHERE submission_id = ?").bind(submissionId),
    env.DB.prepare("DELETE FROM submission_scopes WHERE submission_id = ?").bind(submissionId)
  ];
  chunks(payload.placements, 15).forEach((items) => statements.push(env.DB.prepare(`INSERT INTO submission_items (submission_id, song_id, tier, rank_start, rank_end, points) VALUES ${items.map(() => "(?, ?, ?, ?, ?, ?)").join(",")}`)
    .bind(...items.flatMap((item) => [submissionId, item.songId, item.tier, item.rankStart, item.rankEnd, item.points]))));
  statements.push(env.DB.prepare(`INSERT INTO submission_scopes (submission_id, board) VALUES ${scoreData.scopes.map(() => "(?, ?)").join(",")}`)
    .bind(...scoreData.scopes.flatMap((board) => [submissionId, board])));
  chunks(scoreData.rows, 15).forEach((items) => statements.push(env.DB.prepare(`INSERT INTO submission_scores (submission_id, song_id, board, normalized_points, is_top1) VALUES ${items.map(() => "(?, ?, ?, ?, ?)").join(",")}`)
    .bind(...items.flatMap((item) => [submissionId, item.songId, item.board, item.points, item.top1]))));
  await env.DB.batch(statements);

  return json({ ok: true, submissionId, replaced: Boolean(existing), reviewStatus: audit.status });
}

async function health(env) {
  const checks = {
    worker: { ok: true },
    deviceSalt: { ok: Boolean(env.DEVICE_SALT) },
    database: { ok: false },
    schema: { ok: false, missingTables: [] }
  };
  if (!env.DB) checks.database.error = "DB binding is not configured";
  else {
    try {
      await env.DB.prepare("SELECT 1 AS ok").first();
      checks.database.ok = true;
      const required = ["submissions", "submission_items", "submission_attempts", "submission_scores", "submission_scopes"];
      const placeholders = required.map(() => "?").join(",");
      const result = await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`).bind(...required).all();
      const present = new Set((result.results || []).map((row) => row.name));
      checks.schema.missingTables = required.filter((name) => !present.has(name));
      checks.schema.ok = checks.schema.missingTables.length === 0;
    } catch (error) {
      checks.database.error = String(error?.message || error).slice(0, 160);
    }
  }
  const ok = Object.values(checks).every((check) => check.ok);
  return json({ ok, service: "dan-island-ranking-api", checks, generatedAt: new Date().toISOString() }, ok ? 200 : 503);
}

async function leaderboard(env, board = "overall") {
  if (!ALLOWED_BOARDS.has(board)) throw new PublicError("Invalid leaderboard board");
  const effective = `(s.review_status = 'valid' OR (s.review_status IS NULL AND s.auto_status = 'valid'))`;
  const [ranking, counts, eligible] = await Promise.all([
    env.DB.prepare(`SELECT sc.song_id AS songId, ROUND(SUM(sc.normalized_points) / NULLIF((SELECT COUNT(*) FROM submission_scopes ss JOIN submissions es ON es.id=ss.submission_id WHERE ss.board=? AND (es.review_status='valid' OR (es.review_status IS NULL AND es.auto_status='valid'))), 0) / 10, 2) AS score, SUM(sc.is_top1) AS top1Count, COUNT(*) AS supportCount FROM submission_scores sc JOIN submissions s ON s.id=sc.submission_id WHERE sc.board=? AND ${effective} GROUP BY sc.song_id ORDER BY score DESC, top1Count DESC, supportCount DESC, sc.song_id ASC LIMIT 50`).bind(board, board).all(),
    env.DB.prepare(`SELECT SUM(CASE WHEN ${effective} THEN 1 ELSE 0 END) AS validSubmissions, SUM(CASE WHEN s.review_status IS NULL AND s.auto_status='suspect' THEN 1 ELSE 0 END) AS pendingReview FROM submissions s`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM submission_scopes ss JOIN submissions s ON s.id=ss.submission_id WHERE ss.board=? AND ${effective}`).bind(board).first()
  ]);
  const entries = (ranking.results || []).map((row, index) => ({ rank: index + 1, songId: row.songId, score: Number(row.score), top1Count: Number(row.top1Count), supportCount: Number(row.supportCount) }));
  return json({ board, entries, eligibleSubmissions: Number(eligible?.count || 0), validSubmissions: Number(counts?.validSubmissions || 0), pendingReview: Number(counts?.pendingReview || 0), generatedAt: new Date().toISOString() });
}

function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.ADMIN_TOKEN}`) throw new PublicError("Unauthorized", 401);
}

async function adminList(request, env) {
  requireAdmin(request, env);
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const filter = url.searchParams.get("status") || "all";
  const where = filter === "suspect" ? "WHERE review_status IS NULL AND auto_status='suspect'" : filter === "invalid" ? "WHERE review_status='invalid'" : filter === "valid" ? "WHERE review_status='valid' OR (review_status IS NULL AND auto_status='valid')" : "";
  const result = await env.DB.prepare(`SELECT id, journey_id AS journeyId, started_at AS startedAt, completed_at AS completedAt, duration_ms AS durationMs, catalog_size AS catalogSize, choice_count AS choiceCount, median_choice_ms AS medianChoiceMs, fast_choice_count AS fastChoiceCount, auto_status AS autoStatus, auto_flags AS autoFlags, review_status AS reviewStatus, moderator_note AS moderatorNote, (SELECT song_id FROM submission_items WHERE submission_id=submissions.id AND tier='champion' LIMIT 1) AS championId, created_at AS createdAt, updated_at AS updatedAt FROM submissions ${where} ORDER BY updated_at DESC LIMIT ?`).bind(limit).all();
  return json({ submissions: (result.results || []).map((row) => ({ ...row, autoFlags: JSON.parse(row.autoFlags || "[]") })) });
}

async function adminDetail(request, env, id) {
  requireAdmin(request, env);
  const submission = await env.DB.prepare(`SELECT id, journey_id AS journeyId, duration_ms AS durationMs, auto_status AS autoStatus, auto_flags AS autoFlags, review_status AS reviewStatus, moderator_note AS moderatorNote, payload_json AS payloadJson, created_at AS createdAt, updated_at AS updatedAt FROM submissions WHERE id=?`).bind(id).first();
  if (!submission) throw new PublicError("Submission not found", 404);
  const attempts = await env.DB.prepare(`SELECT id, journey_id AS journeyId, duration_ms AS durationMs, auto_status AS autoStatus, auto_flags AS autoFlags, received_at AS receivedAt FROM submission_attempts WHERE submission_id=? ORDER BY received_at DESC LIMIT 20`).bind(id).all();
  return json({ submission: { ...submission, autoFlags: JSON.parse(submission.autoFlags || "[]"), payload: JSON.parse(submission.payloadJson), payloadJson: undefined }, attempts: (attempts.results || []).map((row) => ({ ...row, autoFlags: JSON.parse(row.autoFlags || "[]") })) });
}

async function adminUpdate(request, env, id) {
  requireAdmin(request, env);
  const body = await readJson(request, 10000);
  const reviewStatus = body.reviewStatus === null || body.reviewStatus === "auto" ? null : body.reviewStatus;
  if (reviewStatus !== null && !["valid", "invalid"].includes(reviewStatus)) throw new PublicError("Invalid reviewStatus");
  const note = String(body.note || "").slice(0, 1000);
  const result = await env.DB.prepare("UPDATE submissions SET review_status=?, moderator_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(reviewStatus, note, id).run();
  if (!result.meta.changes) throw new PublicError("Submission not found", 404);
  return json({ ok: true });
}
