-- Eco Ação — schema inicial (SQLite)
-- (schema_migrations é criada em migrate.js antes deste ficheiro)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  legacy_user_id TEXT UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  tipo TEXT,
  subtipo TEXT,
  escola TEXT,
  cidade TEXT,
  codigo_ibge_cidade INTEGER,
  cidade_sigla TEXT,
  turma TEXT,
  class_group TEXT,
  disciplina TEXT,
  cargo TEXT,
  funcao TEXT,
  relacao TEXT,
  pontos_totais INTEGER NOT NULL DEFAULT 0 CHECK (pontos_totais >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS actions_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  pontos INTEGER NOT NULL CHECK (pontos >= 0),
  icon TEXT,
  color TEXT,
  descricao TEXT
);

CREATE TABLE IF NOT EXISTS user_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  pontos INTEGER NOT NULL CHECK (pontos >= 0),
  action_date TEXT NOT NULL,
  legacy_log_id TEXT UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_actions_user ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_action_key ON user_actions(action_key);

CREATE TRIGGER IF NOT EXISTS trg_user_actions_ai
AFTER INSERT ON user_actions
BEGIN
  UPDATE users SET
    pontos_totais = (SELECT COALESCE(SUM(pontos), 0) FROM user_actions WHERE user_id = NEW.user_id),
    updated_at = datetime('now')
  WHERE id = NEW.user_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_user_actions_ad
AFTER DELETE ON user_actions
BEGIN
  UPDATE users SET
    pontos_totais = (SELECT COALESCE(SUM(pontos), 0) FROM user_actions WHERE user_id = OLD.user_id),
    updated_at = datetime('now')
  WHERE id = OLD.user_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_user_actions_au
AFTER UPDATE OF pontos ON user_actions
BEGIN
  UPDATE users SET
    pontos_totais = (SELECT COALESCE(SUM(pontos), 0) FROM user_actions WHERE user_id = NEW.user_id),
    updated_at = datetime('now')
  WHERE id = NEW.user_id;
END;
