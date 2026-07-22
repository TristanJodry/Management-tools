import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Database as SqlDatabase } from 'sql.js';

// Safe determination of current directory & project root
function getDir(): { currentDir: string; projectRoot: string } {
  let currentDir = process.cwd();
  try {
    if (typeof __dirname !== 'undefined' && __dirname) {
      currentDir = __dirname;
    } else if (typeof import.meta !== 'undefined' && import.meta && typeof import.meta.url === 'string') {
      currentDir = path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    currentDir = process.cwd();
  }

  const projectRoot = fs.existsSync(path.join(currentDir, 'package.json'))
    ? currentDir
    : path.resolve(currentDir, '..');

  return { currentDir, projectRoot };
}

const { currentDir, projectRoot } = getDir();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.join(projectRoot, 'data');
const SQLITE_FILE = path.join(DATA_DIR, 'database.sqlite');
const JSON_FILE = path.join(DATA_DIR, 'db.json');

let db: SqlDatabase | null = null;

async function initDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Dynamic import of sql.js to avoid module format issues
    const sqlJsModule = await import('sql.js');
    const initSqlJs = typeof sqlJsModule.default === 'function' ? sqlJsModule.default : (sqlJsModule as any);

    const wasmCandidates = [
      path.join(currentDir, 'sql-wasm.wasm'),
      path.join(projectRoot, 'dist', 'sql-wasm.wasm'),
      path.join(projectRoot, 'node_modules/sql.js/dist/sql-wasm.wasm'),
    ];

    const wasmPath = wasmCandidates.find((p) => fs.existsSync(p));

    const SQL = await initSqlJs(
      wasmPath
        ? {
            locateFile: () => wasmPath,
          }
        : undefined
    );

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
    console.log('✅ Base de données SQLite initialisée avec succès :', SQLITE_FILE);
  } catch (err) {
    console.error('⚠️ Note BDD SQLite (utilisation du fallback JSON) :', err);
    db = null;
    if (!fs.existsSync(JSON_FILE)) {
      fs.writeFileSync(JSON_FILE, JSON.stringify({ projects: [], globalTeam: [] }, null, 2), 'utf-8');
    }
  }
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
    console.error('Erreur écriture fichier SQLite :', err);
  }
}

function getAllProjects(): any[] {
  if (!db) {
    try {
      if (fs.existsSync(JSON_FILE)) {
        const raw = fs.readFileSync(JSON_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.projects) ? parsed.projects : [];
      }
    } catch {
      return [];
    }
    return [];
  }

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
    console.error('Erreur lecture projets :', err);
    return [];
  }
}

function saveProjectsToDb(projects: any[]): boolean {
  if (!db) {
    try {
      let current = { projects: [], globalTeam: [] };
      if (fs.existsSync(JSON_FILE)) {
        current = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
      }
      current.projects = projects as any;
      fs.writeFileSync(JSON_FILE, JSON.stringify(current, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Erreur sauvegarde projets JSON :', err);
      return false;
    }
  }

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
    console.error('Erreur sauvegarde projets BDD :', err);
    return false;
  }
}

function getAllTeam(): any[] {
  if (!db) {
    try {
      if (fs.existsSync(JSON_FILE)) {
        const raw = fs.readFileSync(JSON_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.globalTeam) ? parsed.globalTeam : [];
      }
    } catch {
      return [];
    }
    return [];
  }

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
    console.error('Erreur lecture équipe :', err);
    return [];
  }
}

function saveTeamToDb(team: any[]): boolean {
  if (!db) {
    try {
      let current = { projects: [], globalTeam: [] };
      if (fs.existsSync(JSON_FILE)) {
        current = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
      }
      current.globalTeam = team as any;
      fs.writeFileSync(JSON_FILE, JSON.stringify(current, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Erreur sauvegarde équipe JSON :', err);
      return false;
    }
  }

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
    console.error('Erreur sauvegarde équipe BDD :', err);
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
    res.status(500).json({ error: 'Échec de sauvegarde des données' });
  }
});

app.post('/api/projects', (req, res) => {
  const { projects } = req.body;
  if (!Array.isArray(projects)) {
    return res.status(400).json({ error: 'projects doit être un tableau' });
  }
  if (saveProjectsToDb(projects)) {
    res.json({ success: true, projects: getAllProjects() });
  } else {
    res.status(500).json({ error: 'Échec sauvegarde des projets' });
  }
});

app.post('/api/team', (req, res) => {
  const { globalTeam } = req.body;
  if (!Array.isArray(globalTeam)) {
    return res.status(400).json({ error: 'globalTeam doit être un tableau' });
  }
  if (saveTeamToDb(globalTeam)) {
    res.json({ success: true, globalTeam: getAllTeam() });
  } else {
    res.status(500).json({ error: 'Échec sauvegarde de l\'équipe' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    databaseMode: db ? 'sqlite' : 'json_fallback',
    databaseFile: SQLITE_FILE,
    projectsCount: getAllProjects().length,
    teamCount: getAllTeam().length,
  });
});

async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== 'production') {
    // Dynamic import of Vite for development only
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(currentDir, 'index.html'))
      ? currentDir
      : path.join(projectRoot, 'dist');

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur Gouvernance démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Erreur fatale au démarrage du serveur :', err);
  process.exit(1);
});
