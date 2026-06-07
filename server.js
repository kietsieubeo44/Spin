const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DB_DIR = path.join(ROOT_DIR, 'db');
const DB_PATH = path.join(DB_DIR, 'database.db');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const EXPORT_DIR = path.join(ROOT_DIR, 'exports');
const REWARDS_JSON = path.join(DATA_DIR, 'rewards.json');

const WHEEL_SEGMENTS = ['100 FP', '200 FP', '300 FP', '500 FP', '1000 FP', '2000 FP'];
const DEFAULT_REWARDS = [
  { reward: '100 FP', weight: 20, remaining: 999 },
  { reward: '200 FP', weight: 15, remaining: 999 },
  { reward: '300 FP', weight: 12, remaining: 999 },
  { reward: '500 FP', weight: 8, remaining: 100 },
  { reward: '1000 FP', weight: 2, remaining: 10 },
  { reward: '2000 FP', weight: 1, remaining: 2 },
];

fs.mkdirSync(DB_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(EXPORT_DIR, { recursive: true });

const db = new Database(DB_PATH);

app.use(express.json({ limit: '32kb' }));
app.use(morgan('tiny'));
app.use(express.static(PUBLIC_DIR));
app.use('/exports', express.static(EXPORT_DIR));

function initDatabase() {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reward TEXT NOT NULL UNIQUE,
      weight INTEGER NOT NULL,
      remaining INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT UNIQUE NOT NULL,
      reward TEXT NOT NULL,
      segment INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  seedRewards();
}



function seedRewards() {
  if (!fs.existsSync(REWARDS_JSON)) {
    fs.writeFileSync(REWARDS_JSON, JSON.stringify(DEFAULT_REWARDS, null, 2));
  }

  const count = db.prepare('SELECT COUNT(*) AS count FROM rewards').get().count;
  if (count > 0) return;

  const rewards = JSON.parse(fs.readFileSync(REWARDS_JSON, 'utf8'));
  const insert = db.prepare('INSERT INTO rewards (reward, weight, remaining) VALUES (?, ?, ?)');
  const seed = db.transaction((rows) => {
    rows.forEach((row) => insert.run(row.reward, row.weight, row.remaining));
  });

  seed(rewards.filter((row) => WHEEL_SEGMENTS.includes(row.reward)));
}

function normalizeEmployeeId(employeeId) {
  if (typeof employeeId !== 'string' && typeof employeeId !== 'number') return '';
  return String(employeeId).trim();
}

function requirePlayerId(req, res) {
  const playerId = normalizeEmployeeId(req.body && req.body.employeeId);

  if (!playerId || playerId.length > 64) {
    res.status(400).json({ error: 'Player ID is required' });
    return null;
  }

  // Only accept numeric Player IDs
  if (!/^\d+$/.test(playerId)) {
    res.status(400).json({ error: 'Player ID must be numeric' });
    return null;
  }

  return playerId;
}

function getExistingClaim(playerId) {
  return db.prepare('SELECT player_id, reward, segment, created_at FROM claims WHERE player_id = ?').get(playerId);
}

function selectWeightedReward() {
  const rows = db
    .prepare('SELECT id, reward, weight, remaining FROM rewards WHERE remaining > 0 AND weight > 0 ORDER BY id')
    .all()
    .filter((row) => WHEEL_SEGMENTS.includes(row.reward));

  if (rows.length === 0) return null;

  const totalWeight = rows.reduce((total, row) => total + row.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const row of rows) {
    if (cursor < row.weight) return row;
    cursor -= row.weight;
  }

  return rows[rows.length - 1];
}

function nowSql() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

function csvCell(value) {
  return `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
}

function htmlCell(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.get('/api/rewards', (req, res) => {
  res.json({
    segments: WHEEL_SEGMENTS.map((reward, index) => ({ reward, segment: index })),
  });
});

app.post('/api/check-id', (req, res) => {
  const playerId = requirePlayerId(req, res);
  if (!playerId) return;

  if (getExistingClaim(playerId)) {
    res.status(409).json({ error: 'This Player ID has already participated.' });
    return;
  }

  res.json({ ok: true });
});

app.post('/api/spin', (req, res) => {
  const playerId = requirePlayerId(req, res);
  if (!playerId) return;

  if (getExistingClaim(playerId)) {
    res.status(409).json({ error: 'This Player ID has already participated.' });
    return;
  }

  const selected = selectWeightedReward();
  if (!selected) {
    res.status(500).json({ error: 'No rewards available' });
    return;
  }

  const segment = WHEEL_SEGMENTS.indexOf(selected.reward);
  if (segment === -1) {
    res.status(500).json({ error: 'Reward is not mapped to the wheel' });
    return;
  }

  const insertClaim = db.prepare(
    'INSERT INTO claims (player_id, reward, segment, created_at) VALUES (?, ?, ?, ?)'
  );
  const decrementReward = db.prepare(
    'UPDATE rewards SET remaining = remaining - 1 WHERE id = ? AND remaining > 0'
  );

  const transaction = db.transaction(() => {
    const info = decrementReward.run(selected.id);
    if (info.changes !== 1) throw new Error('Reward unavailable');
    insertClaim.run(playerId, selected.reward, segment, nowSql());
  });

  try {
    transaction();
    res.json({ reward: selected.reward, segment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record claim' });
  }
});

app.post('/api/claim', (req, res) => {
  const playerId = requirePlayerId(req, res);
  if (!playerId) return;

  const claim = getExistingClaim(playerId);
  if (!claim) {
    res.status(404).json({ error: 'No claim found' });
    return;
  }

  res.json(claim);
});

app.get('/api/winners', (req, res) => {
  const rows = db
    .prepare('SELECT player_id, reward, segment, created_at FROM claims ORDER BY created_at DESC')
    .all();
  res.json(rows);
});

app.get('/api/dashboard', (req, res) => {
  const totalSpins = db.prepare('SELECT COUNT(*) AS count FROM claims').get().count;
  const rewards = db.prepare('SELECT reward, COUNT(*) AS count FROM claims GROUP BY reward ORDER BY reward').all();
  const remaining = db.prepare('SELECT reward, remaining FROM rewards ORDER BY id').all();

  res.json({
    totalSpins,
    totalWinners: totalSpins,
    rewards,
    remaining,
  });
});

app.get('/api/export', async (req, res) => {
  const claims = db
    .prepare('SELECT player_id, reward, created_at FROM claims ORDER BY created_at')
    .all();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = path.join(EXPORT_DIR, `winners-${timestamp}.csv`);
  const xlsPath = path.join(EXPORT_DIR, `winners-${timestamp}.xls`);
  const csvLines = [
    'Player ID,Reward,Claim Time',
    ...claims.map((claim) => [claim.player_id, claim.reward, claim.created_at].map(csvCell).join(',')),
  ];
  const htmlRows = claims
    .map(
      (claim) =>
        `<tr><td>${htmlCell(claim.player_id)}</td><td>${htmlCell(claim.reward)}</td><td>${htmlCell(
          claim.created_at
        )}</td></tr>`
    )
    .join('');
  const xlsHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr><th>Player ID</th><th>Reward</th><th>Claim Time</th></tr></thead><tbody>${htmlRows}</tbody></table></body></html>`;

  fs.writeFileSync(csvPath, csvLines.join('\n'));
  fs.writeFileSync(xlsPath, xlsHtml);

  res.json({
    csv: `/exports/${path.basename(csvPath)}`,
    xls: `/exports/${path.basename(xlsPath)}`,
  });
});

app.post('/api/reset', (req, res) => {
  try {
    const rewards = JSON.parse(fs.readFileSync(REWARDS_JSON, 'utf8')).filter((row) =>
      WHEEL_SEGMENTS.includes(row.reward)
    );
    const insertReward = db.prepare('INSERT INTO rewards (reward, weight, remaining) VALUES (?, ?, ?)');
    const reset = db.transaction(() => {
      db.prepare('DELETE FROM claims').run();
      db.prepare('DELETE FROM rewards').run();
      rewards.forEach((row) => insertReward.run(row.reward, row.weight, row.remaining));
    });

    reset();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

initDatabase();

app.listen(PORT, () => {
  console.log(`COSMO GOLDEN SPIN running on port ${PORT}`);
});
