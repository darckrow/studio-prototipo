CREATE TABLE IF NOT EXISTS clients (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
 contact TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
 archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
 id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id), title TEXT NOT NULL,
 service TEXT NOT NULL CHECK(service IN ('Vídeo','Social media','Design','Outro')),
 stage TEXT NOT NULL CHECK(stage IN ('Briefing','Em produção','Em aprovação','Concluído')),
 due_date TEXT NOT NULL, value_cents INTEGER NOT NULL DEFAULT 0 CHECK(value_cents>=0),
 paid_cents INTEGER NOT NULL DEFAULT 0 CHECK(paid_cents>=0 AND paid_cents<=value_cents),
 notes TEXT NOT NULL DEFAULT '', archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
 id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL REFERENCES projects(id), title TEXT NOT NULL,
 done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1))
);
CREATE INDEX IF NOT EXISTS projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS projects_due ON projects(due_date);
CREATE INDEX IF NOT EXISTS tasks_project ON tasks(project_id);
PRAGMA user_version = 1;
