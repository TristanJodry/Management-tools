import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Ensure data directory and db.json exist on the server
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  const initialData = {
    projects: [],
    globalTeam: []
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
}

// Helper functions to read/write DB
function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB file:', err);
    return { projects: [], globalTeam: [] };
  }
}

function writeDb(data: { projects: any[]; globalTeam: any[] }) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing DB file:', err);
    return false;
  }
}

// API Routes
app.get('/api/data', (_req, res) => {
  const data = readDb();
  res.json(data);
});

app.post('/api/data', (req, res) => {
  const { projects, globalTeam } = req.body;
  const current = readDb();
  const updated = {
    projects: projects !== undefined ? projects : current.projects,
    globalTeam: globalTeam !== undefined ? globalTeam : current.globalTeam,
  };
  if (writeDb(updated)) {
    res.json({ success: true, ...updated });
  } else {
    res.status(500).json({ error: 'Failed to write to DB' });
  }
});

app.post('/api/projects', (req, res) => {
  const { projects } = req.body;
  const current = readDb();
  const updated = {
    ...current,
    projects: Array.isArray(projects) ? projects : current.projects,
  };
  if (writeDb(updated)) {
    res.json({ success: true, projects: updated.projects });
  } else {
    res.status(500).json({ error: 'Failed to write projects to DB' });
  }
});

app.post('/api/team', (req, res) => {
  const { globalTeam } = req.body;
  const current = readDb();
  const updated = {
    ...current,
    globalTeam: Array.isArray(globalTeam) ? globalTeam : current.globalTeam,
  };
  if (writeDb(updated)) {
    res.json({ success: true, globalTeam: updated.globalTeam });
  } else {
    res.status(500).json({ error: 'Failed to write team to DB' });
  }
});

async function startServer() {
  // Vite middleware for development
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
