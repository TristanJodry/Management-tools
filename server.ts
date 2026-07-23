import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Database as SqlDatabase } from 'sql.js';
import { ADMIN_CONFIG } from './src/config/adminConfig';

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
      CREATE TABLE IF NOT EXISTS user_groups (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS users (
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

function getAllGroups(): any[] {
  if (!db) {
    try {
      if (fs.existsSync(JSON_FILE)) {
        const raw = fs.readFileSync(JSON_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.userGroups) ? parsed.userGroups : [];
      }
    } catch {
      return [];
    }
    return [];
  }

  try {
    const stmt = db.prepare('SELECT data FROM user_groups');
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
    console.error('Erreur lecture groupes :', err);
    return [];
  }
}

function saveGroupsToDb(groups: any[]): boolean {
  if (!db) {
    try {
      let current = { projects: [], globalTeam: [], userGroups: [], users: [] };
      if (fs.existsSync(JSON_FILE)) {
        current = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
      }
      current.userGroups = groups as any;
      fs.writeFileSync(JSON_FILE, JSON.stringify(current, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Erreur sauvegarde groupes JSON :', err);
      return false;
    }
  }

  try {
    db.run('DELETE FROM user_groups');
    const now = new Date().toISOString();
    for (const g of groups) {
      db.run('INSERT INTO user_groups (id, data, updated_at) VALUES (?, ?, ?)', [
        g.id || `grp-${Date.now()}`,
        JSON.stringify(g),
        now,
      ]);
    }
    saveSqliteFile();
    return true;
  } catch (err) {
    console.error('Erreur sauvegarde groupes BDD :', err);
    return false;
  }
}

function getAllUsers(): any[] {
  if (!db) {
    try {
      if (fs.existsSync(JSON_FILE)) {
        const raw = fs.readFileSync(JSON_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.users) ? parsed.users : [];
      }
    } catch {
      return [];
    }
    return [];
  }

  try {
    const stmt = db.prepare('SELECT data FROM users');
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
    console.error('Erreur lecture utilisateurs :', err);
    return [];
  }
}

function saveUsersToDb(users: any[]): boolean {
  if (!db) {
    try {
      let current = { projects: [], globalTeam: [], userGroups: [], users: [] };
      if (fs.existsSync(JSON_FILE)) {
        current = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
      }
      current.users = users as any;
      fs.writeFileSync(JSON_FILE, JSON.stringify(current, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Erreur sauvegarde utilisateurs JSON :', err);
      return false;
    }
  }

  try {
    db.run('DELETE FROM users');
    const now = new Date().toISOString();
    for (const u of users) {
      db.run('INSERT INTO users (id, data, updated_at) VALUES (?, ?, ?)', [
        u.id || `usr-${Date.now()}`,
        JSON.stringify(u),
        now,
      ]);
    }
    saveSqliteFile();
    return true;
  } catch (err) {
    console.error('Erreur sauvegarde utilisateurs BDD :', err);
    return false;
  }
}

// API Routes
app.get('/api/data', (_req, res) => {
  const projects = getAllProjects();
  const globalTeam = getAllTeam();
  const userGroups = getAllGroups();
  const users = getAllUsers();
  res.json({ projects, globalTeam, userGroups, users });
});

app.post('/api/data', (req, res) => {
  const { projects, globalTeam, userGroups, users } = req.body;
  let pOk = true;
  let tOk = true;
  let gOk = true;
  let uOk = true;

  if (Array.isArray(projects)) pOk = saveProjectsToDb(projects);
  if (Array.isArray(globalTeam)) tOk = saveTeamToDb(globalTeam);
  if (Array.isArray(userGroups)) gOk = saveGroupsToDb(userGroups);
  if (Array.isArray(users)) uOk = saveUsersToDb(users);

  if (pOk && tOk && gOk && uOk) {
    res.json({
      success: true,
      projects: getAllProjects(),
      globalTeam: getAllTeam(),
      userGroups: getAllGroups(),
      users: getAllUsers()
    });
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

app.get('/api/groups', (_req, res) => {
  res.json({ userGroups: getAllGroups() });
});

app.post('/api/groups', (req, res) => {
  const { userGroups } = req.body;
  if (!Array.isArray(userGroups)) {
    return res.status(400).json({ error: 'userGroups doit être un tableau' });
  }
  if (saveGroupsToDb(userGroups)) {
    res.json({ success: true, userGroups: getAllGroups() });
  } else {
    res.status(500).json({ error: 'Échec sauvegarde des groupes' });
  }
});

app.get('/api/users', (_req, res) => {
  res.json({ users: getAllUsers() });
});

app.post('/api/users', (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    return res.status(400).json({ error: 'users doit être un tableau' });
  }
  if (saveUsersToDb(users)) {
    res.json({ success: true, users: getAllUsers() });
  } else {
    res.status(500).json({ error: 'Échec sauvegarde des utilisateurs' });
  }
});

app.get('/api/auth/admin-info', (_req, res) => {
  res.json({
    username: ADMIN_CONFIG.username,
    firstName: ADMIN_CONFIG.firstName,
    lastName: ADMIN_CONFIG.lastName,
    email: ADMIN_CONFIG.email,
    role: ADMIN_CONFIG.role
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }

  const trimmedUsername = String(username).trim();
  const trimmedPassword = String(password).trim();

  // 1. Check Root Admin credentials from ADMIN_CONFIG
  if (
    trimmedUsername.toLowerCase() === ADMIN_CONFIG.username.toLowerCase() &&
    trimmedPassword === ADMIN_CONFIG.password
  ) {
    const adminUser = {
      id: ADMIN_CONFIG.id,
      username: ADMIN_CONFIG.username,
      firstName: ADMIN_CONFIG.firstName,
      lastName: ADMIN_CONFIG.lastName,
      email: ADMIN_CONFIG.email,
      role: ADMIN_CONFIG.role,
      groupIds: [],
      isAdmin: true
    };
    return res.json({ success: true, user: adminUser });
  }

  // 2. Check stored users
  const users = getAllUsers();
  const user = users.find(
    (u) => u.username?.toLowerCase() === trimmedUsername.toLowerCase() && u.password === trimmedPassword
  );

  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    return res.json({ success: true, user: userWithoutPassword });
  }

  return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
});

app.post('/api/auth/change-password', (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ error: 'Identifiant et nouveau mot de passe requis' });
  }

  // Root Admin password update
  if (userId === ADMIN_CONFIG.id) {
    if (oldPassword && oldPassword.trim() !== ADMIN_CONFIG.password) {
      return res.status(400).json({ error: 'Ancien mot de passe administrateur incorrect' });
    }
    ADMIN_CONFIG.password = String(newPassword).trim();
    return res.json({ success: true, message: 'Mot de passe administrateur mis à jour' });
  }

  // Regular user password update
  const users = getAllUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  if (oldPassword && users[userIndex].password && users[userIndex].password !== String(oldPassword).trim()) {
    return res.status(400).json({ error: 'Ancien mot de passe incorrect' });
  }

  users[userIndex].password = String(newPassword).trim();
  saveUsersToDb(users);

  return res.json({ success: true, message: 'Mot de passe mis à jour avec succès' });
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
