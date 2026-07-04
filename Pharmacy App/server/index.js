import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Backup-Timestamp');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

function safeShopId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
}

function dbPath(shopId) {
  return path.join(DATA_DIR, `${safeShopId(shopId)}.sqlite`);
}

function metaPath(shopId) {
  return path.join(DATA_DIR, `${safeShopId(shopId)}.meta.json`);
}

// Last-write-wins: a backup is only accepted if its timestamp is newer than
// whatever is already stored, so a stale device can never clobber fresher data.
app.post('/api/backup/:shopId', (req, res) => {
  const shopId = req.params.shopId;
  const timestamp = req.header('X-Backup-Timestamp') || new Date().toISOString();

  let existingMeta = null;
  if (fs.existsSync(metaPath(shopId))) {
    existingMeta = JSON.parse(fs.readFileSync(metaPath(shopId), 'utf-8'));
  }
  if (existingMeta && existingMeta.timestamp > timestamp) {
    return res.status(409).json({ ok: false, error: 'A newer backup already exists.', latest: existingMeta.timestamp });
  }

  fs.writeFileSync(dbPath(shopId), req.body);
  fs.writeFileSync(metaPath(shopId), JSON.stringify({ timestamp, size: req.body.length }));
  res.json({ ok: true, timestamp });
});

app.get('/api/backup/:shopId/latest', (req, res) => {
  const shopId = req.params.shopId;
  if (!fs.existsSync(dbPath(shopId))) return res.status(404).json({ ok: false, error: 'No backup found.' });
  const meta = JSON.parse(fs.readFileSync(metaPath(shopId), 'utf-8'));
  res.set('X-Backup-Timestamp', meta.timestamp);
  res.set('Content-Type', 'application/octet-stream');
  res.send(fs.readFileSync(dbPath(shopId)));
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Pharmacy App sync server listening on :${PORT}`);
});
