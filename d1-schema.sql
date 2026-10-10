-- Ezra Maroc Contact Form — D1 Schema
-- Run with: npx wrangler d1 execute ezra-contact-submissions --remote --file=d1-schema.sql

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  other_subject_details TEXT,
  message TEXT NOT NULL,
  consent TEXT NOT NULL,
  terms_consent TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'fr',
  ip_address TEXT,
  turnstile_verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT DEFAULT 'new'
);

-- Index for querying by date (admin use)
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
