ALTER TABLE projects ADD COLUMN published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1));
ALTER TABLE projects ADD COLUMN published_date TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN published_url TEXT NOT NULL DEFAULT '';
CREATE TABLE production_steps (
 project_id INTEGER NOT NULL REFERENCES projects(id), step TEXT NOT NULL,
 done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)), PRIMARY KEY(project_id,step)
);
CREATE TABLE plans (
 id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL REFERENCES clients(id),
 week_start TEXT NOT NULL, title TEXT NOT NULL, instructions TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, UNIQUE(client_id,week_start)
);
CREATE TABLE plan_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER NOT NULL REFERENCES plans(id),
 project_id INTEGER REFERENCES projects(id), title TEXT NOT NULL, publish_date TEXT NOT NULL,
 format TEXT NOT NULL, channel TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '',
 thumbnail TEXT NOT NULL DEFAULT '', material_url TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'rascunho' CHECK(status IN ('rascunho','pendente','aprovado','ajustes')),
 feedback TEXT NOT NULL DEFAULT '', reviewer TEXT NOT NULL DEFAULT '', reviewed_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE plan_exports (
 token TEXT PRIMARY KEY, plan_id INTEGER NOT NULL REFERENCES plans(id), snapshot TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1, imported INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE INDEX plan_items_plan ON plan_items(plan_id);
CREATE INDEX plan_exports_plan ON plan_exports(plan_id);
PRAGMA user_version = 2;
