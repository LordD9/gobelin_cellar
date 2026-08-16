-- Référence lisible du schéma (source exécutée : schema.ts)
-- Tables : locations, wines, apogee_rules

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_id);

CREATE TABLE IF NOT EXISTS wines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domaine TEXT NOT NULL,
  cuvee TEXT,
  type TEXT NOT NULL CHECK (type IN ('rouge', 'blanc', 'rose', 'petillant')),
  region TEXT,
  appellation TEXT,
  millesime INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  location_id INTEGER,
  cepages TEXT,
  domaine_info TEXT,
  accords TEXT,
  potentiel_garde TEXT,
  drink_from INTEGER,
  drink_until INTEGER,
  apogee_source TEXT NOT NULL DEFAULT 'manual' CHECK (apogee_source IN ('auto', 'manual')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wines_location_id ON wines(location_id);
CREATE INDEX IF NOT EXISTS idx_wines_type ON wines(type);
CREATE INDEX IF NOT EXISTS idx_wines_apogee ON wines(drink_from, drink_until);

CREATE TABLE IF NOT EXISTS apogee_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT CHECK (type IS NULL OR type IN ('rouge', 'blanc', 'rose', 'petillant')),
  region TEXT,
  appellation TEXT,
  drink_from_offset INTEGER NOT NULL,
  drink_until_offset INTEGER NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_apogee_rules_type ON apogee_rules(type);
