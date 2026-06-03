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
const segments = [
  "100 FP",
  "200 FP",
  "300 FP",
  "500 FP",
  "1000 FP",
  "2000 FP"
];
// Build segments array of length 14 by cycling through rewards (order from rewards table)


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
  
  const segments = [
  "100 FP",
  "200 FP",
  "300 FP",
  "500 FP",
  "1000 FP",
  "2000 FP"
];

const segment = segments.indexOf(chosen.reward);
  

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
