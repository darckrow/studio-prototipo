CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE oauth_sessions (state_hash TEXT PRIMARY KEY, payload TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE calendar_links (
 project_id INTEGER PRIMARY KEY REFERENCES projects(id), calendar_id TEXT NOT NULL, event_id TEXT NOT NULL,
 remote_hash TEXT NOT NULL DEFAULT '', local_hash TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pendente',
 error TEXT NOT NULL DEFAULT '', synced_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE google_forms (
 id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER NOT NULL REFERENCES plans(id), account_email TEXT NOT NULL,
 form_id TEXT NOT NULL DEFAULT '', responder_url TEXT NOT NULL DEFAULT '', snapshot TEXT NOT NULL,
 snapshot_hash TEXT NOT NULL, include_images INTEGER NOT NULL DEFAULT 0, questions TEXT NOT NULL DEFAULT '{}', media TEXT NOT NULL DEFAULT '[]',
 status TEXT NOT NULL DEFAULT 'rascunho', error TEXT NOT NULL DEFAULT '', last_response_at TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, synced_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX google_forms_plan ON google_forms(plan_id);
CREATE TABLE google_form_responses (
 form_row_id INTEGER NOT NULL REFERENCES google_forms(id), response_id TEXT NOT NULL, submitted_at TEXT NOT NULL,
 outcome TEXT NOT NULL, detail TEXT NOT NULL, PRIMARY KEY(form_row_id,response_id,submitted_at)
);
PRAGMA user_version = 3;
