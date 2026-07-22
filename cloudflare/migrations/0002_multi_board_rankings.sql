PRAGMA foreign_keys = ON;

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

CREATE INDEX IF NOT EXISTS idx_scopes_board ON submission_scopes(board, submission_id);
CREATE INDEX IF NOT EXISTS idx_scores_board_song ON submission_scores(board, song_id);

-- Preserve the historical total leaderboard. Category scores begin with v2 submissions,
-- because older payloads did not attach a stable board key to every placement.
INSERT OR IGNORE INTO submission_scopes (submission_id, board)
SELECT id, 'overall' FROM submissions;

INSERT OR IGNORE INTO submission_scores (submission_id, song_id, board, normalized_points, is_top1)
SELECT i.submission_id,
       i.song_id,
       'overall',
       i.points * 1000.0 / totals.total_points,
       CASE WHEN i.tier = 'champion' THEN 1 ELSE 0 END
FROM submission_items i
JOIN (
  SELECT submission_id, SUM(points) AS total_points
  FROM submission_items
  GROUP BY submission_id
) totals ON totals.submission_id = i.submission_id
WHERE totals.total_points > 0;
