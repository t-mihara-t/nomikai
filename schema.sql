CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  total_amount INTEGER,
  drinker_ratio REAL NOT NULL DEFAULT 1.3,
  has_after_party INTEGER NOT NULL DEFAULT 0,
  paypay_id TEXT,
  kampa_amount INTEGER NOT NULL DEFAULT 0,
  parent_event_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_event_id) REFERENCES events(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS candidate_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  date_time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_dates_event_id ON candidate_dates(event_id);

CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('attending', 'absent', 'pending')),
  is_drinker INTEGER NOT NULL DEFAULT 1,
  amount_to_pay INTEGER,
  paid_status INTEGER NOT NULL DEFAULT 0,
  paypay_id TEXT,
  multiplier REAL NOT NULL DEFAULT 1.0,
  discount_rate REAL NOT NULL DEFAULT 0.0,
  join_after_party INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);

CREATE TABLE IF NOT EXISTS venue_selections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  venue_type TEXT NOT NULL CHECK (venue_type IN ('primary', 'after_party')),
  restaurant_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_venue_selections_event_id ON venue_selections(event_id);

CREATE TABLE IF NOT EXISTS participant_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL,
  candidate_date_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('attending', 'absent', 'pending')),
  after_party_status TEXT CHECK (after_party_status IN ('attending', 'absent', 'pending')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_date_id) REFERENCES candidate_dates(id) ON DELETE CASCADE,
  UNIQUE(participant_id, candidate_date_id)
);

CREATE INDEX IF NOT EXISTS idx_participant_responses_participant ON participant_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_responses_date ON participant_responses(candidate_date_id);
