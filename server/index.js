import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
app.use('/uploads', express.static(UPLOADS_DIR));

// ── DB ──────────────────────────────────────────────────────────────────────
const DEFAULT_DATA = {
  users: [],
  announcements: [],
  homework: [],
  notes: [],
  canteen: [],
  tests: [],
  explain: [],
  partners: [],
  bans: [],
  warns: []
};

const adapter = new JSONFile(path.join(__dirname, 'db.json'));
const db = new Low(adapter, DEFAULT_DATA);

async function initDB() {
  await db.read();
  db.data = { ...DEFAULT_DATA, ...db.data };
  await db.write();
}

// ── FILE UPLOAD ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.json({ success: false, error: 'No file' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// ── HELPERS ──────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = '19376';
const MAX_WARNS = 3;
const MAX_DAYS = 20;

function isBanned(deviceId) {
  return !!db.data.bans.find(b => b.deviceId === deviceId);
}

function getUser(deviceId) {
  return db.data.users.find(u => u.deviceId === deviceId);
}

function warnCount(deviceId) {
  return db.data.warns.filter(w => w.deviceId === deviceId).length;
}

// ── USERS ────────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  await db.read();
  const { deviceId, nick, class: cls, school, avatar } = req.body;

  if (!deviceId || !nick || !school) return res.json({ success: false, error: 'Missing fields' });
  if (isBanned(deviceId)) return res.json({ success: false, banned: true });

  let user = db.data.users.find(u => u.deviceId === deviceId);
  if (user) {
    Object.assign(user, { nick, class: cls, school, avatar, updatedAt: Date.now() });
  } else {
    user = { id: uuidv4(), deviceId, nick, class: cls, school, avatar, createdAt: Date.now() };
    db.data.users.push(user);
  }

  await db.write();
  io.emit('users:update');
  res.json({ success: true, user });
});

app.get('/api/user/:deviceId', async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.deviceId === req.params.deviceId);
  const banned = isBanned(req.params.deviceId);
  const warns = warnCount(req.params.deviceId);
  res.json({ user: user || null, banned, warns });
});

app.put('/api/user/:deviceId', async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.deviceId === req.params.deviceId);
  if (!user) return res.json({ success: false, error: 'Not found' });
  const { nick, class: cls, avatar } = req.body;
  if (nick) user.nick = nick;
  if (cls) user.class = cls;
  if (avatar !== undefined) user.avatar = avatar;
  user.updatedAt = Date.now();
  await db.write();
  io.emit('users:update');
  res.json({ success: true, user });
});

app.post('/api/check-ban', async (req, res) => {
  await db.read();
  const { deviceId } = req.body;
  res.json({ banned: isBanned(deviceId), warns: warnCount(deviceId) });
});

// ── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
app.get('/api/announcements', async (req, res) => {
  await db.read();
  const { school, classId } = req.query;
  const now = Date.now();
  let items = db.data.announcements.filter(a => {
    if (a.school !== school) return false;
    if (a.expiresAt && a.expiresAt < now) return false;
    if (classId && a.classId && a.classId !== classId) return false;
    return true;
  });
  res.json([...items].reverse());
});

app.post('/api/announcements', async (req, res) => {
  await db.read();
  const { deviceId, school, classId, category, color, title, text, image, dateFrom, dateTo } = req.body;

  if (isBanned(deviceId)) return res.json({ success: false, banned: true });
  const user = getUser(deviceId);
  if (!user) return res.json({ success: false, error: 'Register first' });

  let expiresAt = null;
  if (dateTo) {
    const target = new Date(dateTo).getTime();
    const diffDays = Math.min(MAX_DAYS, Math.ceil((target - Date.now()) / 86400000));
    if (diffDays > 0) expiresAt = Date.now() + diffDays * 86400000;
  }

  const item = {
    id: uuidv4(), deviceId, userId: user.id,
    userName: user.nick, userAvatar: user.avatar,
    school, classId: classId || null, category, color,
    title, text, image: image || null,
    dateFrom: dateFrom || null, dateTo: dateTo || null, expiresAt,
    createdAt: Date.now()
  };
  db.data.announcements.push(item);
  await db.write();
  io.emit('announcements:new', item);
  res.json({ success: true, item });
});

app.delete('/api/announcements/:id', async (req, res) => {
  await db.read();
  const { deviceId, admin } = req.body;
  const item = db.data.announcements.find(a => a.id === req.params.id);
  if (!item) return res.json({ success: false });
  if (item.deviceId !== deviceId && admin !== ADMIN_PASSWORD)
    return res.json({ success: false, error: 'Unauthorized' });

  db.data.announcements = db.data.announcements.filter(a => a.id !== req.params.id);
  await db.write();
  io.emit('announcements:delete', req.params.id);
  res.json({ success: true });
});

// ── HOMEWORK ─────────────────────────────────────────────────────────────────
app.get('/api/homework', async (req, res) => {
  await db.read();
  const { school, classId, subject } = req.query;
  let items = db.data.homework.filter(h => h.school === school);
  if (classId) items = items.filter(h => h.classId === classId);
  if (subject) items = items.filter(h => h.subject === subject);
  res.json([...items].reverse().slice(0, 100));
});

app.post('/api/homework', async (req, res) => {
  await db.read();
  const { deviceId, school, classId, subject, date, tasks } = req.body;
  if (isBanned(deviceId)) return res.json({ success: false, banned: true });
  const user = getUser(deviceId);
  if (!user) return res.json({ success: false });

  const item = {
    id: uuidv4(), deviceId,
    userName: user.nick, userAvatar: user.avatar,
    school, classId, subject, date, tasks,
    createdAt: Date.now()
  };
  db.data.homework.push(item);
  await db.write();
  io.emit('homework:new', item);
  res.json({ success: true, item });
});

app.delete('/api/homework/:id', async (req, res) => {
  await db.read();
  const { deviceId, admin } = req.body;
  const item = db.data.homework.find(h => h.id === req.params.id);
  if (!item) return res.json({ success: false });
  if (item.deviceId !== deviceId && admin !== ADMIN_PASSWORD)
    return res.json({ success: false });
  db.data.homework = db.data.homework.filter(h => h.id !== req.params.id);
  await db.write();
  io.emit('homework:delete', req.params.id);
  res.json({ success: true });
});

// ── NOTES (конспекты) ─────────────────────────────────────────────────────
app.get('/api/notes', async (req, res) => {
  await db.read();
  const { school, classNum, subject, topic } = req.query;
  let items = db.data.notes.filter(n => n.school === school);
  if (classNum) items = items.filter(n => n.classNum === classNum);
  if (subject) items = items.filter(n => n.subject === subject);
  if (topic) items = items.filter(n => n.topic === topic);
  res.json([...items].reverse());
});

app.post('/api/notes', async (req, res) => {
  await db.read();
  const { deviceId, school, classNum, subject, topic, text, image } = req.body;
  if (isBanned(deviceId)) return res.json({ success: false, banned: true });
  const user = getUser(deviceId);
  if (!user) return res.json({ success: false });

  const item = {
    id: uuidv4(), deviceId,
    userName: user.nick, userAvatar: user.avatar, userClass: user.class,
    school, classNum, subject, topic,
    text: text || null, image: image || null,
    ratings: { clarity: [], completeness: [], quality: [] },
    createdAt: Date.now()
  };
  db.data.notes.push(item);
  await db.write();
  io.emit('notes:new', item);
  res.json({ success: true, item });
});

app.post('/api/notes/:id/rate', async (req, res) => {
  await db.read();
  const { deviceId, clarity, completeness, quality } = req.body;
  const note = db.data.notes.find(n => n.id === req.params.id);
  if (!note) return res.json({ success: false });
  ['clarity', 'completeness', 'quality'].forEach(k => {
    note.ratings[k] = note.ratings[k].filter(r => r.deviceId !== deviceId);
  });
  if (clarity !== undefined) note.ratings.clarity.push({ deviceId, value: clarity });
  if (completeness !== undefined) note.ratings.completeness.push({ deviceId, value: completeness });
  if (quality !== undefined) note.ratings.quality.push({ deviceId, value: quality });
  await db.write();
  io.emit('notes:rated', { id: note.id, ratings: note.ratings });
  res.json({ success: true });
});

app.delete('/api/notes/:id', async (req, res) => {
  await db.read();
  const { deviceId, admin } = req.body;
  const item = db.data.notes.find(n => n.id === req.params.id);
  if (!item) return res.json({ success: false });
  if (item.deviceId !== deviceId && admin !== ADMIN_PASSWORD)
    return res.json({ success: false });
  db.data.notes = db.data.notes.filter(n => n.id !== req.params.id);
  await db.write();
  res.json({ success: true });
});

// ── CANTEEN ───────────────────────────────────────────────────────────────────
app.get('/api/canteen', async (req, res) => {
  await db.read();
  const { school } = req.query;
  const items = db.data.canteen.filter(c => c.school === school);
  res.json([...items].reverse().slice(0, 14));
});

app.post('/api/canteen', async (req, res) => {
  await db.read();
  const { deviceId, school, date, menuItems } = req.body;
  if (isBanned(deviceId)) return res.json({ success: false, banned: true });
  const user = getUser(deviceId);
  if (!user) return res.json({ success: false });

  const item = {
    id: uuidv4(), deviceId,
    userName: user.nick, school, date,
    menuItems: menuItems || [],
    ratings: {},
    createdAt: Date.now()
  };
  db.data.canteen.push(item);
  await db.write();
  io.emit('canteen:new', item);
  res.json({ success: true, item });
});

app.post('/api/canteen/:id/rate', async (req, res) => {
  await db.read();
  const { deviceId, itemName, value } = req.body;
  const menu = db.data.canteen.find(c => c.id === req.params.id);
  if (!menu) return res.json({ success: false });
  if (!menu.ratings[itemName]) menu.ratings[itemName] = [];
  menu.ratings[itemName] = menu.ratings[itemName].filter(r => r.deviceId !== deviceId);
  menu.ratings[itemName].push({ deviceId, value });
  await db.write();
  io.emit('canteen:rated', { id: menu.id, ratings: menu.ratings });
  res.json({ success: true });
});

app.delete('/api/canteen/:id', async (req, res) => {
  await db.read();
  const { deviceId, admin } = req.body;
  const item = db.data.canteen.find(c => c.id === req.params.id);
  if (!item) return res.json({ success: false });
  if (item.deviceId !== deviceId && admin !== ADMIN_PASSWORD)
    return res.json({ success: false });
  db.data.canteen = db.data.canteen.filter(c => c.id !== req.params.id);
  await db.write();
  res.json({ success: true });
});

// ── TESTS (контрольные) ───────────────────────────────────────────────────────
app.get('/api/tests', async (req, res) => {
  await db.read();
  const { school, classNum, subject } = req.query;
  let items = db.data.tests.filter(t => t.school === school);
  if (classNum) items = items.filter(t => t.classNum === classNum);
  if (subject) items = items.filter(t => t.subject === subject);
  res.json([...items].reverse());
});

app.post('/api/tests', async (req, res) => {
  await db.read();
  const { deviceId, school, classNum, subject, date, image, text } = req.body;
  if (isBanned(deviceId)) return res.json({ success: false, banned: true });
  const user = getUser(deviceId);
  if (!user) return res.json({ success: false });

  const item = {
    id: uuidv4(), deviceId,
    userName: user.nick, userAvatar: user.avatar,
    school, classNum, subject, date,
    image: image || null, text: text || null,
    createdAt: Date.now()
  };
  db.data.tests.push(item);
  await db.write();
  io.emit('tests:new', item);
  res.json({ success: true, item });
});

app.delete('/api/tests/:id', async (req, res) => {
  await db.read();
  const { deviceId, admin } = req.body;
  const item = db.data.tests.find(t => t.id === req.params.id);
  if (!item) return res.json({ success: false });
  if (item.deviceId !== deviceId && admin !== ADMIN_PASSWORD)
    return res.json({ success: false });
  db.data.tests = db.data.tests.filter(t => t.id !== req.params.id);
  await db.write();
  res.json({ success: true });
});

// ── EXPLAIN (объясни мне) ─────────────────────────────────────────────────────
app.get('/api/explain', async (req, res) => {
  await db.read();
  const { school } = req.query;
  const items = db.data.explain.filter(e => e.school === school);
  res.json([...items].reverse().slice(0, 50));
});

app.post('/api/explain', async (req, res) => {
  await db.read();
  const { deviceId, school, subject, question } = req.body;
  if (isBanned(deviceId)) return res.json({ success: false, banned: true });
  const user = getUser(deviceId);
  if (!user) return res.json({ success: false });

  const item = {
    id: uuidv4(), deviceId,
    userName: user.nick, userAvatar: user.avatar, userClass: user.class,
    school, subject, question, answers: [],
    createdAt: Date.now()
  };
  db.data.explain.push(item);
  await db.write();
  io.emit('explain:new', item);
  res.json({ success: true, item });
});

app.post('/api/explain/:id/answer', async (req, res) => {
  await db.read();
  const { deviceId, text, image } = req.body;
  if (isBanned(deviceId)) return res.json({ success: false, banned: true });
  const user = getUser(deviceId);
  const item = db.data.explain.find(e => e.id === req.params.id);
  if (!item || !user) return res.json({ success: false });

  const answer = {
    id: uuidv4(), deviceId,
    userName: user.nick, userAvatar: user.avatar,
    text, image: image || null,
    createdAt: Date.now()
  };
  item.answers.push(answer);
  await db.write();
  io.emit('explain:answer', { questionId: item.id, answer });
  res.json({ success: true, answer });
});

app.delete('/api/explain/:id', async (req, res) => {
  await db.read();
  const { deviceId, admin } = req.body;
  const item = db.data.explain.find(e => e.id === req.params.id);
  if (!item) return res.json({ success: false });
  if (item.deviceId !== deviceId && admin !== ADMIN_PASSWORD)
    return res.json({ success: false });
  db.data.explain = db.data.explain.filter(e => e.id !== req.params.id);
  await db.write();
  res.json({ success: true });
});

// ── PARTNERS (найди напарника) ─────────────────────────────────────────────────
app.get('/api/partners', async (req, res) => {
  await db.read();
  const { school } = req.query;
  const items = db.data.partners.filter(p => p.school === school && !p.matched);
  res.json([...items].reverse().slice(0, 50));
});

app.post('/api/partners', async (req, res) => {
  await db.read();
  const { deviceId, school, subject, grade, level, description } = req.body;
  if (isBanned(deviceId)) return res.json({ success: false, banned: true });
  const user = getUser(deviceId);
  if (!user) return res.json({ success: false });

  const existing = db.data.partners.find(p => p.deviceId === deviceId && !p.matched);
  if (existing) {
    Object.assign(existing, { subject, grade, level, description, updatedAt: Date.now() });
    await db.write();
    io.emit('partners:update', existing);
    return res.json({ success: true, item: existing });
  }

  const item = {
    id: uuidv4(), deviceId,
    userName: user.nick, userAvatar: user.avatar, userClass: user.class,
    school, subject, grade, level, description,
    matched: false, meetingPlace: null,
    createdAt: Date.now()
  };
  db.data.partners.push(item);
  await db.write();
  io.emit('partners:new', item);
  res.json({ success: true, item });
});

app.post('/api/partners/:id/meet', async (req, res) => {
  await db.read();
  const { deviceId, place } = req.body;
  const item = db.data.partners.find(p => p.id === req.params.id);
  if (!item) return res.json({ success: false });
  item.matched = true;
  item.meetingPlace = place;
  item.matchedBy = deviceId;
  item.matchedAt = Date.now();
  await db.write();
  io.emit('partners:matched', item);
  res.json({ success: true, item });
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  res.json({ success: password === ADMIN_PASSWORD });
});

app.get('/api/admin/users', async (req, res) => {
  const { password } = req.query;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ success: false });
  await db.read();
  const users = db.data.users.map(u => ({
    ...u,
    warns: warnCount(u.deviceId),
    banned: isBanned(u.deviceId)
  }));
  res.json({ success: true, users });
});

app.post('/api/admin/warn', async (req, res) => {
  const { password, deviceId, reason } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ success: false });
  await db.read();

  db.data.warns.push({ id: uuidv4(), deviceId, reason: reason || '', createdAt: Date.now() });
  const count = warnCount(deviceId);

  if (count >= MAX_WARNS && !isBanned(deviceId)) {
    db.data.bans.push({ deviceId, reason: '3 предупреждения', createdAt: Date.now() });
  }

  await db.write();
  io.emit('admin:warn', { deviceId, warnCount: count });
  res.json({ success: true, warnCount: count, banned: count >= MAX_WARNS });
});

app.post('/api/admin/unban', async (req, res) => {
  const { password, deviceId } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ success: false });
  await db.read();
  db.data.bans = db.data.bans.filter(b => b.deviceId !== deviceId);
  db.data.warns = db.data.warns.filter(w => w.deviceId !== deviceId);
  await db.write();
  io.emit('admin:unban', { deviceId });
  res.json({ success: true });
});

app.put('/api/admin/user/:id', async (req, res) => {
  const { password, ...updates } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ success: false });
  await db.read();
  const user = db.data.users.find(u => u.id === req.params.id);
  if (!user) return res.json({ success: false });
  const { nick, class: cls, avatar } = updates;
  if (nick) user.nick = nick;
  if (cls) user.class = cls;
  if (avatar !== undefined) user.avatar = avatar;
  user.updatedAt = Date.now();
  await db.write();
  io.emit('users:update');
  res.json({ success: true, user });
});

app.get('/api/admin/all-content', async (req, res) => {
  const { password } = req.query;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ success: false });
  await db.read();
  res.json({
    success: true,
    announcements: [...db.data.announcements].reverse(),
    homework: [...db.data.homework].reverse(),
    notes: [...db.data.notes].reverse(),
    tests: [...db.data.tests].reverse()
  });
});

// ── SOCKET ────────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('📱 Connected:', socket.id);
  socket.on('disconnect', () => console.log('📴 Disconnected:', socket.id));
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🏫 MOGG School сервер запущен`);
    console.log(`📡 http://0.0.0.0:${PORT}`);
    console.log(`📁 DB: ${path.join(__dirname, 'db.json')}`);
    console.log(`🖼  Uploads: ${UPLOADS_DIR}\n`);
  });
});
