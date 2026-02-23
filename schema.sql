CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  total_amount INTEGER,
  drinker_ratio REAL NOT NULL DEFAULT 1.3,
  paypay_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'absent')),
  is_drinker INTEGER NOT NULL DEFAULT 1,
  amount_to_pay INTEGER,
  paid_status INTEGER NOT NULL DEFAULT 0,
  paypay_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
