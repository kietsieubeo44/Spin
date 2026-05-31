const express = require('express');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const { stringify } = require('csv-stringify/sync');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');

const app = express();
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static('public'));

const DB_DIR = path.resolve(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'cosmo.db');

const db = new Database(DB_PATH);

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reward TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 1,
      remaining INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE,
      employee_id TEXT UNIQUE,
      reward TEXT,
      status TEXT,
      created_at TEXT
    );
  `);

  // seed from data/rewards.json if table empty
  const row = db.prepare('SELECT COUNT(*) AS c FROM rewards').get();
  if (!row || row.c === 0) {
    const rewards = JSON.parse(fs.readFileSync(path.join(__dirname,'data','rewards.json')));
    const insert = db.prepare('INSERT INTO rewards (reward, weight, remaining) VALUES (?, ?, ?)');
    const tx = db.transaction((items) => { for (const it of items) insert.run(it.reward, it.weight, it.remaining); });
    tx(rewards);
    console.log('Seeded rewards');
  }
}

init();

function getSegments() {
  // Build 14 segments by cycling rewards in order
  const rows = db.prepare('SELECT reward FROM rewards ORDER BY id').all();
  const rewards = rows.map(r => r.reward);
  const segments = [];
  while (segments.length < 14) {
    for (let r of rewards) {
      if (segments.length >= 14) break;
      segments.push(r);
    }
  }
  return segments;
}

function selectWeightedReward() {
  // choose from rewards with remaining > 0
  const rows = db.prepare('SELECT id, reward, weight, remaining FROM rewards WHERE remaining>0').all();
  if (!rows || rows.length === 0) return null;
  const pool = [];
  rows.forEach(r => { for (let i=0;i<r.weight;i++) pool.push(r); });
  const pick = pool[Math.floor(Math.random()*pool.length)];
  return pick;
}

app.post('/api/spin', (req, res) => {
  try {
    const pick = selectWeightedReward();
    if (!pick) return res.status(400).json({ error: 'No prizes remaining' });
    // pick segment index where that reward appears
    const segments = getSegments();
    const indices = segments.map((s,i)=>s===pick.reward?i:-1).filter(i=>i>=0);
    const segment = indices[Math.floor(Math.random()*indices.length)];

    // reserve: decrement remaining and create a reservation claim with token
    const token = randomUUID();
    const now = new Date().toISOString();
    const tx = db.transaction(() => {
      db.prepare('UPDATE rewards SET remaining = remaining - 1 WHERE id = ? AND remaining > 0').run(pick.id);
      db.prepare('INSERT INTO claims (token, reward, status, created_at) VALUES (?, ?, ?, ?)').run(token, pick.reward, 'reserved', now);
    });
    tx();
    res.json({ reward: pick.reward, segment, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/check-id', (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId || typeof employeeId !== 'string') return res.status(400).json({ error: 'Missing employeeId' });
  const v = employeeId.trim().toUpperCase();
  if (!/^EMP\d{3,6}$/.test(v)) return res.status(400).json({ error: 'Invalid format. Use EMP###' });
  const exists = db.prepare('SELECT 1 FROM claims WHERE employee_id = ?').get(v);
  if (exists) return res.status(409).json({ error: 'Employee has already claimed' });
  res.json({ ok: true });
});

app.post('/api/claim', (req, res) => {
  const { token, employeeId } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing token' });
  if (!employeeId) return res.status(400).json({ error: 'Missing employeeId' });
  const emp = employeeId.trim().toUpperCase();
  if (!/^EMP\d{3,6}$/.test(emp)) return res.status(400).json({ error: 'Invalid employeeId format' });
  try {
    const tx = db.transaction(() => {
      // ensure employee not claimed
      const dup = db.prepare('SELECT 1 FROM claims WHERE employee_id = ?').get(emp);
      if (dup) throw new Error('Employee has already claimed');
      // find reservation
      const row = db.prepare('SELECT id, reward, status FROM claims WHERE token = ?').get(token);
      if (!row) throw new Error('Invalid or expired token');
      if (row.status === 'claimed') throw new Error('Already claimed');
      const now = new Date().toISOString();
      db.prepare('UPDATE claims SET employee_id = ?, status = ?, created_at = ? WHERE id = ?').run(emp, 'claimed', now, row.id);
      return { employee_id: emp, reward: row.reward, created_at: now };
    });
    const result = tx();
    res.json(result);
  } catch (err) {
    // on error, try to rollback reservation restoration if needed
    if (err.message && err.message.includes('Employee has already claimed')) return res.status(409).json({ error: err.message });
    console.error(err);
    res.status(400).json({ error: err.message || 'Claim failed' });
  }
});

app.get('/api/winners', (req, res) => {
  const rows = db.prepare('SELECT employee_id, reward, created_at FROM claims WHERE status = "claimed" ORDER BY created_at DESC').all();
  res.json(rows);
});

app.get('/api/export', (req, res) => {
  const rows = db.prepare('SELECT employee_id, reward, created_at FROM claims WHERE status = "claimed" ORDER BY created_at DESC').all();
  const data = rows.map(r => [r.employee_id, r.reward, r.created_at]);
  const csv = stringify([['Employee ID', 'Reward', 'Claim Time'], ...data]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="winners.csv"');
  res.send(csv);
});

app.get('/api/dashboard', (req, res) => {
  const totalSpins = db.prepare('SELECT COUNT(*) AS c FROM claims').get().c;
  const totalWinners = db.prepare('SELECT COUNT(*) AS c FROM claims WHERE status = "claimed"').get().c;
  const prizes = db.prepare('SELECT reward, remaining FROM rewards').all();
  res.json({ totalSpins, totalWinners, prizes });
});

app.post('/api/reset', (req, res) => {
  try {
    db.exec('DELETE FROM claims; DELETE FROM rewards;');
    const rewards = JSON.parse(fs.readFileSync(path.join(__dirname,'data','rewards.json')));
    const insert = db.prepare('INSERT INTO rewards (reward, weight, remaining) VALUES (?, ?, ?)');
    const tx = db.transaction((items) => { for (const it of items) insert.run(it.reward, it.weight, it.remaining); });
    tx(rewards);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log('Server listening on', port));
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const Database = require('better-sqlite3');
const morgan = require('morgan');

const app = express();
app.use(bodyParser.json());
app.use(morgan('tiny'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/exports', express.static(path.join(__dirname, 'exports')));

const DB_DIR = path.join(__dirname, 'db');
const DB_PATH = path.join(DB_DIR, 'database.db');
const DATA_DIR = path.join(__dirname, 'data');
const REWARDS_JSON = path.join(DATA_DIR, 'rewards.json');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(path.join(__dirname, 'exports'))) fs.mkdirSync(path.join(__dirname, 'exports'), { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

function init() {
  db.exec(`PRAGMA foreign_keys = ON;`);
  db.exec(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT UNIQUE NOT NULL
  );`);

  db.exec(`CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reward TEXT NOT NULL,
    weight INTEGER NOT NULL,
    remaining INTEGER NOT NULL
  );`);

  db.exec(`CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT UNIQUE NOT NULL,
    reward TEXT NOT NULL,
    segment INTEGER,
    created_at TEXT NOT NULL
  );`);

  // Seed employees if empty
  const empCount = db.prepare('SELECT COUNT(*) as c FROM employees').get().c;
  if (empCount === 0) {
    const insert = db.prepare('INSERT INTO employees (employee_id) VALUES (?)');
    const insertMany = db.transaction((arr) => {
      for (const e of arr) insert.run(e);
    });
    const arr = [];
    for (let i = 1; i <= 200; i++) arr.push(`EMP${String(i).padStart(3,'0')}`);
    insertMany(arr);
    console.log('Seeded employees');
  }

  // Seed rewards from JSON if rewards table empty
  const rewardsCount = db.prepare('SELECT COUNT(*) as c FROM rewards').get().c;
  if (rewardsCount === 0) {
    if (!fs.existsSync(REWARDS_JSON)) {
      // create default
      const defaultRewards = [
        { reward: '100 FP', weight: 20, remaining: 999 },
        { reward: '200 FP', weight: 15, remaining: 999 },
        { reward: '300 FP', weight: 12, remaining: 999 },
        { reward: '500 FP', weight: 8, remaining: 100 },
        { reward: '1000 FP', weight: 2, remaining: 10 },
        { reward: '2000 FP', weight: 1, remaining: 2 }
      ];
      fs.writeFileSync(REWARDS_JSON, JSON.stringify(defaultRewards, null, 2));
    }
    const raw = fs.readFileSync(REWARDS_JSON, 'utf8');
    const arr = JSON.parse(raw);
    const insert = db.prepare('INSERT INTO rewards (reward, weight, remaining) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => {
      for (const r of rows) insert.run(r.reward, r.weight, r.remaining);
    });
    insertMany(arr);
    console.log('Seeded rewards from rewards.json');
  }
}

init();

// Utility: get rewards list from DB
function getRewards() {
  return db.prepare('SELECT id, reward, weight, remaining FROM rewards WHERE remaining > 0 ORDER BY id').all();
}

// Build segments array of length 14 by cycling through rewards (order from rewards table)
function buildSegments() {
  const all = db.prepare('SELECT reward FROM rewards ORDER BY id').all();
  const pool = all.map(r => r.reward);
  const segs = [];
  let i = 0;
  while (segs.length < 14) {
    segs.push(pool[i % pool.length]);
    i++;
  }
  return segs;
}

// Weighted select considering remaining > 0
function selectWeightedReward() {
  const rows = db.prepare('SELECT id, reward, weight, remaining FROM rewards WHERE remaining > 0').all();
  if (!rows || rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.weight, 0);
  let rnd = Math.random() * total;
  for (const r of rows) {
    if (rnd < r.weight) return r;
    rnd -= r.weight;
  }
  return rows[rows.length - 1];
}

app.post('/api/check-id', (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId || typeof employeeId !== 'string') return res.status(400).json({ error: 'employeeId is required' });
  const emp = db.prepare('SELECT employee_id FROM employees WHERE employee_id = ?').get(employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee ID not found' });
  const claimed = db.prepare('SELECT 1 FROM claims WHERE employee_id = ?').get(employeeId);
  if (claimed) return res.status(409).json({ error: 'This Employee ID has already claimed a reward.' });
  res.json({ ok: true });
});

app.post('/api/spin', (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId || typeof employeeId !== 'string') return res.status(400).json({ error: 'employeeId is required' });
  const emp = db.prepare('SELECT employee_id FROM employees WHERE employee_id = ?').get(employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee ID not found' });
  const already = db.prepare('SELECT 1 FROM claims WHERE employee_id = ?').get(employeeId);
  if (already) return res.status(409).json({ error: 'This Employee ID has already claimed a reward.' });

  const chosen = selectWeightedReward();
  if (!chosen) return res.status(500).json({ error: 'No rewards available' });

  // build segments and pick a segment index corresponding to chosen.reward
  const segments = buildSegments();
  const candidateIndexes = segments.map((v, idx) => v === chosen.reward ? idx : -1).filter(i => i >= 0);
  const segment = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];

  const now = new Date().toISOString().replace('T', ' ').replace('Z','');

  const insert = db.prepare('INSERT INTO claims (employee_id, reward, segment, created_at) VALUES (?, ?, ?, ?)');
  const dec = db.prepare('UPDATE rewards SET remaining = remaining - 1 WHERE id = ? AND remaining > 0');

  const tx = db.transaction(() => {
    const info = dec.run(chosen.id);
    if (info.changes === 0) throw new Error('Reward no longer available');
    insert.run(employeeId, chosen.reward, segment, now);
  });

  try {
    tx();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record claim' });
  }

  res.json({ reward: chosen.reward, segment });
});

app.post('/api/claim', (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
  const claim = db.prepare('SELECT employee_id, reward, created_at FROM claims WHERE employee_id = ?').get(employeeId);
  if (!claim) return res.status(404).json({ error: 'No claim found' });
  res.json(claim);
});

app.get('/api/winners', (req, res) => {
  const rows = db.prepare('SELECT employee_id, reward, created_at FROM claims ORDER BY created_at DESC').all();
  res.json(rows);
});

app.get('/api/dashboard', (req, res) => {
  const totalSpins = db.prepare('SELECT COUNT(*) as c FROM claims').get().c;
  const totalWinners = totalSpins; // same
  const rewards = db.prepare('SELECT reward, SUM(1) as count FROM claims GROUP BY reward').all();
  const remaining = db.prepare('SELECT reward, remaining FROM rewards ORDER BY id').all();
  res.json({ totalSpins, totalWinners, rewards, remaining });
});

app.get('/api/export', async (req, res) => {
  const claims = db.prepare('SELECT employee_id, reward, created_at FROM claims ORDER BY created_at').all();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = path.join(__dirname, 'exports', `winners-${timestamp}.csv`);
  const xlsxPath = path.join(__dirname, 'exports', `winners-${timestamp}.xlsx`);

  const csvLines = ['Employee ID,Reward,Claim Time', ...claims.map(c => `${c.employee_id},${c.reward},${c.created_at}`)];
  fs.writeFileSync(csvPath, csvLines.join('\n'));

  // create XLSX
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Winners');
  ws.columns = [
    { header: 'Employee ID', key: 'employee_id', width: 20 },
    { header: 'Reward', key: 'reward', width: 15 },
    { header: 'Claim Time', key: 'created_at', width: 25 }
  ];
  claims.forEach(c => ws.addRow(c));
  await wb.xlsx.writeFile(xlsxPath);

  res.json({ csv: `/exports/${path.basename(csvPath)}`, xlsx: `/exports/${path.basename(xlsxPath)}` });
});

app.post('/api/reset', (req, res) => {
  // Reset claims and reload rewards.json
  try {
    db.prepare('DELETE FROM claims').run();
    db.prepare('DELETE FROM rewards').run();
    const raw = fs.readFileSync(REWARDS_JSON, 'utf8');
    const arr = JSON.parse(raw);
    const insert = db.prepare('INSERT INTO rewards (reward, weight, remaining) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => { for (const r of rows) insert.run(r.reward, r.weight, r.remaining); });
    insertMany(arr);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Admin simple html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`COSMO GOLDEN SPIN running on port ${PORT}`));
