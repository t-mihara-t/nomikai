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

-- Create participant_responses table for per-date responses
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

-- Add kampa_amount and parent_event_id to events
ALTER TABLE events ADD COLUMN kampa_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN parent_event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;

-- Add multiplier, discount_rate, join_after_party to participants
ALTER TABLE participants ADD COLUMN multiplier REAL NOT NULL DEFAULT 1.0;
ALTER TABLE participants ADD COLUMN discount_rate REAL NOT NULL DEFAULT 0.0;
ALTER TABLE participants ADD COLUMN join_after_party INTEGER NOT NULL DEFAULT 0;

-- Add auto_delete_at and is_active to events (Safe Exit)
ALTER TABLE events ADD COLUMN auto_delete_at TEXT;
ALTER TABLE events ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

-- Create arrivals table (Heroic Entry)
CREATE TABLE IF NOT EXISTS arrivals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  participant_id INTEGER NOT NULL,
  eta_minutes INTEGER,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'approaching' CHECK (status IN ('approaching', 'arrived', 'dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_arrivals_event_id ON arrivals(event_id);

-- Create drink_orders table (Pre-order system)
CREATE TABLE IF NOT EXISTS drink_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  participant_id INTEGER NOT NULL,
  drink_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drink_orders_event_id ON drink_orders(event_id);

-- Create custom_venue_links table (Google Maps URL etc.)
CREATE TABLE IF NOT EXISTS custom_venue_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  venue_type TEXT NOT NULL DEFAULT 'primary' CHECK (venue_type IN ('primary', 'after_party')),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_venue_links_event_id ON custom_venue_links(event_id);

-- Create recruit_points table (Point accumulation & contribution)
CREATE TABLE IF NOT EXISTS recruit_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'contributed')),
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recruit_points_event_id ON recruit_points(event_id);

-- Add LINE integration columns
ALTER TABLE events ADD COLUMN line_user_id TEXT;
ALTER TABLE arrivals ADD COLUMN line_notified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE arrivals ADD COLUMN line_reminder_sent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE arrivals ADD COLUMN reminder_at TEXT;

-- Users table: unified user management by LINE user ID
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_user_id TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  nearest_station TEXT,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('organizer', 'participant')),
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Transactions table: payment history, rounding fee log, affiliate log
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  participant_id INTEGER,
  user_id INTEGER,
  type TEXT NOT NULL CHECK (type IN ('payment', 'rounding_fee', 'affiliate', 'refund', 'points_earned', 'points_used')),
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_event_id ON transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
