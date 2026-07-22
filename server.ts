import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import initSqlJs, { Database as SqlDatabase } from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const SQLITE_FILE = path.join(DATA_DIR, 'database.sqlite');
const JSON_FILE = path.join(DATA_DIR, 'db.json');

let db: SqlDatabase;

async function initDatabase() {
  const SQL = await initSqlJs();
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(SQLITE_FILE)) {
    const filebuffer = fs.readFileSync(SQLITE_FILE);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS global_team (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  saveSqliteFile();
  console.log('✅ SQLite Database initialized at:', SQLITE_FILE);
}

function saveSqliteFile() {
  try {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(SQLITE_FILE, buffer);

    const projects = getAllProjects();
    const globalTeam = getAllTeam();
    fs.writeFileSync(JSON_FILE, JSON.stringify({ projects, globalTeam }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write SQLite file:', err);
  }
}

function getAllProjects(): any[] {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT data FROM projects');
    const results: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.data) {
        results.push(JSON.parse(row.data as string));
      }
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('Error reading projects from DB:', err);
    return [];
  }
}

function saveProjectsToDb(projects: any[]): boolean {
  if (!db) return false;
  try {
    db.run('DELETE FROM projects');
    const now = new Date().toISOString();
    for (const p of projects) {
      db.run('INSERT INTO projects (id, data, updated_at) VALUES (?, ?, ?)', [
        p.id || `proj-${Date.now()}`,
        JSON.stringify(p),
        now,
      ]);
    }
    saveSqliteFile();
    return true;
  } catch (err) {
    console.error('Error saving projects to DB:', err);
    return false;
  }
}

function getAllTeam(): any[] {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT data FROM global_team');
    const results: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.data) {
        results.push(JSON.parse(row.data as string));
      }
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('Error reading team from DB:', err);
    return [];
  }
}

function saveTeamToDb(team: any[]): boolean {
  if (!db) return false;
  try {
    db.run('DELETE FROM global_team');
    const now = new Date().toISOString();
    for (const m of team) {
      db.run('INSERT INTO global_team (id, data, updated_at) VALUES (?, ?, ?)', [
        m.id || `team-${Date.now()}`,
        JSON.stringify(m),
        now,
      ]);
    }
    saveSqliteFile();
    return true;
  } catch (err) {
    console.error('Error saving team to DB:', err);
    return false;
  }
}

// API Routes
app.get('/api/data', (_req, res) => {
  const projects = getAllProjects();
  const globalTeam = getAllTeam();
  res.json({ projects, globalTeam });
});

app.post('/api/data', (req, res) => {
  const { projects, globalTeam } = req.body;
  let pOk = true;
  let tOk = true;

  if (Array.isArray(projects)) {
    pOk = saveProjectsToDb(projects);
  }
  if (Array.isArray(globalTeam)) {
    tOk = saveTeamToDb(globalTeam);
  }

  if (pOk && tOk) {
    res.json({ success: true, projects: getAllProjects(), globalTeam: getAllTeam() });
  } else {
    res.status(500).json({ error: 'Failed to write to SQLite DB' });
  }
});

app.post('/api/projects', (req, res) => {
  const { projects } = req.body;
  if (!Array.isArray(projects)) {
    return res.status(400).json({ error: 'projects must be an array' });
  }
  if (saveProjectsToDb(projects)) {
    res.json({ success: true, projects: getAllProjects() });
  } else {
    res.status(500).json({ error: 'Failed to save projects' });
  }
});

app.post('/api/team', (req, res) => {
  const { globalTeam } = req.body;
  if (!Array.isArray(globalTeam)) {
    return res.status(400).json({ error: 'globalTeam must be an array' });
  }
  if (saveTeamToDb(globalTeam)) {
    res.json({ success: true, globalTeam: getAllTeam() });
  } else {
    res.status(500).json({ error: 'Failed to save globalTeam' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: fs.existsSync(SQLITE_FILE) ? 'sqlite_active' : 'not_found',
    dbFile: SQLITE_FILE,
    projectsCount: getAllProjects().length,
    teamCount: getAllTeam().length,
  });
});

async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gouvernance App server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
