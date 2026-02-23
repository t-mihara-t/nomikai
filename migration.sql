-- Migration: Add candidate_dates table, has_after_party column, and pending status
-- This file is safe to run on both new and existing databases

-- Create candidate_dates table (IF NOT EXISTS handles idempotency)
CREATE TABLE IF NOT EXISTS candidate_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  date_time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_dates_event_id ON candidate_dates(event_id);

-- Add has_after_party column to events (will fail silently if already exists)
ALTER TABLE events ADD COLUMN has_after_party INTEGER NOT NULL DEFAULT 0;

-- Create venue_selections table
CREATE TABLE IF NOT EXISTS venue_selections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  venue_type TEXT NOT NULL CHECK (venue_type IN ('primary', 'after_party')),
  restaurant_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_venue_selections_event_id ON venue_selections(event_id);
