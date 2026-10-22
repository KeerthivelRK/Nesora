const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me';
const DATA = path.join(__dirname, 'data');
const readJSON = async f => JSON.parse(await fs.readFile(path.join(DATA, f), 'utf8'));

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Public API ---
app.get('/api/profile', async (_req, res, next) => {
  try { res.json(await readJSON('profile.json')); } catch (e) { next(e); }
});

app.get('/api/projects', async (req, res, next) => {
  try {
    let projects = await readJSON('projects.json');
    const { tag, q } = req.query;
    if (tag && tag !== 'all') projects = projects.filter(p => p.tags.includes(tag));
    if (q) {
      const s = String(q).toLowerCase();
      projects = projects.filter(p => (p.title + p.summary).toLowerCase().includes(s));
    }
    res.json(projects);
  } catch (e) { next(e); }
});

app.get('/api/projects/:id', async (req, res, next) => {
  try {
    const p = (await readJSON('projects.json')).find(x => x.id === req.params.id);
    p ? res.json(p) : res.status(404).json({ error: 'Project not found.' });
  } catch (e) { next(e); }
});

// --- Contact form (validated + simple per-IP rate limit) ---
const hits = new Map();
const limited = ip => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60_000);
  recent.push(now); hits.set(ip, recent);
  return recent.length > 3;
};

app.post('/api/contact', async (req, res, next) => {
  try {
    if (limited(req.ip)) return res.status(429).json({ error: 'Too many messages. Try again in a minute.' });
    const { name = '', email = '', message = '', website = '' } = req.body || {};
    if (website) return res.json({ ok: true }); // honeypot: bots fill this
    const errors = {};
    if (name.trim().length < 2) errors.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (message.trim().length < 10) errors.message = 'Write at least 10 characters.';
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Check the highlighted fields.', errors });

    const file = path.join(DATA, 'messages.json');
    const all = await fs.readFile(file, 'utf8').then(JSON.parse).catch(() => []);
    all.push({ id: Date.now().toString(36), name: name.trim(), email: email.trim(),
               message: message.trim(), createdAt: new Date().toISOString() });
    await fs.writeFile(file, JSON.stringify(all, null, 2));
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

// --- Admin: read messages (send header "x-admin-token") ---
app.get('/api/messages', async (req, res) => {
  if (req.get('x-admin-token') !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized.' });
  res.json(await fs.readFile(path.join(DATA, 'messages.json'), 'utf8').then(JSON.parse).catch(() => []));
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Something went wrong on the server.' }); });

app.listen(PORT, () => console.log(`Portfolio running at http://localhost:${PORT}`));
