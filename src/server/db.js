import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../data/emu.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_id TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    z REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS images (
    filename TEXT PRIMARY KEY,
    saved_at INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS image_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_filename TEXT NOT NULL,
    pixel_x INTEGER NOT NULL,
    pixel_y INTEGER NOT NULL
  );
`);

// Migrate from targets.json if DB is empty
const targetCount = db.prepare('SELECT COUNT(*) as c FROM targets').get().c;
if (targetCount === 0) {
  const jsonPath = path.join(__dirname, '../../data/targets.json');
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const ins = db.prepare('INSERT INTO targets (name, image_id, x, y, z) VALUES (?, ?, ?, ?, ?)');
    db.transaction(() => {
      for (const [imageId, imageData] of Object.entries(data)) {
        if (!imageData.targets) continue;
        for (const [name, point] of Object.entries(imageData.targets)) {
          ins.run(name, imageId, point.x, point.y, point.z);
        }
      }
    })();
  }
}

// Migrate images from images-meta.json + images directory
const imagesDir = path.join(__dirname, '../../data/images');
const metaPath = path.join(__dirname, '../../data/images-meta.json');
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
const insImg = db.prepare('INSERT OR IGNORE INTO images (filename, saved_at, name) VALUES (?, ?, ?)');
db.transaction(() => {
  if (fs.existsSync(imagesDir)) {
    for (const f of fs.readdirSync(imagesDir).filter(f => /^[\w.-]+$/.test(f) && !f.startsWith('.'))) {
      const ts = parseInt(f.split('.')[0]);
      insImg.run(f, isNaN(ts) ? Date.now() : ts, meta[f]?.name || '');
    }
  }
})();

export default db;
