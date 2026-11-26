PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    salt BLOB NOT NULL,
    password_hash BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash BLOB PRIMARY KEY,
    csrf TEXT NOT NULL,
    expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY,
    submission_id TEXT NOT NULL UNIQUE,
    created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    navigation INTEGER NOT NULL CHECK (navigation BETWEEN 1 AND 5),
    clarity INTEGER NOT NULL CHECK (clarity BETWEEN 1 AND 5),
    usefulness INTEGER NOT NULL CHECK (usefulness BETWEEN 1 AND 5),
    improvement TEXT NOT NULL,
    highlight TEXT NOT NULL,
    consent_version TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
    lesson TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision > 0),
    intro TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS community_posts (
    id INTEGER PRIMARY KEY,
    created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    author TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    tools TEXT NOT NULL DEFAULT '',
    media_url TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS community_replies (
    id INTEGER PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    hidden INTEGER NOT NULL DEFAULT 0
);
