PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_key TEXT NOT NULL UNIQUE,
  journey_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  catalog_size INTEGER NOT NULL,
  choice_count INTEGER NOT NULL,
  median_choice_ms INTEGER NOT NULL,
  fast_choice_count INTEGER NOT NULL,
  auto_status TEXT NOT NULL CHECK (auto_status IN ('valid', 'suspect')),
  auto_flags TEXT NOT NULL DEFAULT '[]',
  review_status TEXT CHECK (review_status IN ('valid', 'invalid') OR review_status IS NULL),
  moderator_note TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submission_items (
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  rank_start INTEGER NOT NULL,
  rank_end INTEGER NOT NULL,
  points INTEGER NOT NULL,
  PRIMARY KEY (submission_id, song_id)
);

CREATE TABLE IF NOT EXISTS submission_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
  device_key TEXT NOT NULL,
  journey_id TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  auto_status TEXT NOT NULL,
  auto_flags TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submission_scopes (
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  board TEXT NOT NULL CHECK (board IN ('overall', 'original', 'ost', 'stage')),
  PRIMARY KEY (submission_id, board)
);

CREATE TABLE IF NOT EXISTS submission_scores (
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  board TEXT NOT NULL CHECK (board IN ('overall', 'original', 'ost', 'stage')),
  normalized_points REAL NOT NULL,
  is_top1 INTEGER NOT NULL DEFAULT 0 CHECK (is_top1 IN (0, 1)),
  PRIMARY KEY (submission_id, song_id, board)
);

CREATE INDEX IF NOT EXISTS idx_submission_status ON submissions(auto_status, review_status);
CREATE INDEX IF NOT EXISTS idx_submission_updated ON submissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_song ON submission_items(song_id);
CREATE INDEX IF NOT EXISTS idx_attempts_submission ON submission_attempts(submission_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_scopes_board ON submission_scopes(board, submission_id);
CREATE INDEX IF NOT EXISTS idx_scores_board_song ON submission_scores(board, song_id);

