'use strict';
const http = require('http');
const path = require('path');
const fs = require('fs');
const { HttpError, sendJson, readJson, parseCookies } = require('./http');
const { Router } = require('./router');
const { Store } = require('./db');
const { serveStatic, notFound } = require('./static');
const S = require('./session');
const seed = require('./seed');

const ROOT = path.join(__dirname, '..', '..');

// Xóa file trong uploads không còn được công thức/avatar nào tham chiếu (bỏ qua file mới < 1 giờ).
function gcUploads(db, dir) {
  let removed = 0;
  const used = new Set();
  const add = (u) => { if (typeof u === 'string' && u.startsWith('/uploads/')) used.add(path.basename(u)); };
  for (const r of db.recipes) { add(r.image); (r.gallery || []).forEach((g) => add(typeof g === 'string' ? g : g && g.src)); (r.steps || []).forEach((s) => (s.images || []).forEach((g) => add(typeof g === 'string' ? g : g && g.src))); }
  for (const u of db.users) add(u.avatar);
  let files = [];
  try { files = fs.readdirSync(dir); } catch (e) { return 0; }
  for (const f of files) {
    if (used.has(f) || f.startsWith('.')) continue;
    const p = path.join(dir, f);
    try { const st = fs.statSync(p); if (!st.isFile() || Date.now() - st.mtimeMs < 3600 * 1000) continue; fs.unlinkSync(p); removed++; } catch (e) { /* ignore */ }
  }
  const before = db.uploads.length;
  db.uploads = db.uploads.filter((x) => { try { return fs.existsSync(path.join(dir, x.file)); } catch (e) { return false; } });
  if (removed || before !== db.uploads.length) store_dirty = true;
  return removed;
}
let store_dirty = false;

function createApp(opts) {
  opts = opts || {};
  const cfg = {
    port: opts.port != null ? opts.port : (process.env.PORT != null && process.env.PORT !== '' ? Number(process.env.PORT) : 3000),
    host: opts.host || process.env.HOST || '127.0.0.1',
    dbFile: path.resolve(opts.dbFile || process.env.NOMNOM_DB || path.join(ROOT, 'server', 'data', 'db.json')),
    uploadsDir: path.resolve(opts.uploadsDir || process.env.NOMNOM_UPLOADS || path.join(ROOT, 'server', 'uploads')),
    publicDir: path.resolve(opts.publicDir || path.join(ROOT, 'public')),
    rateLimit: opts.rateLimit != null ? opts.rateLimit : (Number(process.env.NOMNOM_RATE_LIMIT) || 10),
    writeLimit: opts.writeLimit != null ? opts.writeLimit : (Number(process.env.NOMNOM_WRITE_LIMIT) || 30),
    contactLimit: opts.contactLimit != null ? opts.contactLimit : (Number(process.env.NOMNOM_CONTACT_LIMIT) || 5),
    uploadQuota: opts.uploadQuota != null ? opts.uploadQuota : 40,
    quiet: !!opts.quiet
  };
  fs.mkdirSync(cfg.publicDir, { recursive: true });
  fs.mkdirSync(cfg.uploadsDir, { recursive: true });

  const store = new Store(cfg.dbFile);
  store.load();
  if (!store.data || !Array.isArray(store.data.recipes) || !store.data.recipes.length) {
    if (!cfg.quiet) console.log('Khởi tạo dữ liệu mẫu...');
    store.set(seed.build());
    store.save();
  }
  const d = store.data;
  for (const k of ['users', 'sessions', 'recipes', 'saved', 'reviews', 'history', 'contacts', 'uploads']) if (!Array.isArray(d[k])) d[k] = [];
  if (S.purgeExpired(d)) store.saveSoon();

  const app = {
    cfg, store, router: new Router(),
    limiter: new S.RateLimiter(cfg.rateLimit, 60000),            // theo IP + định danh
    ipLimiter: new S.RateLimiter(Math.max(60, cfg.rateLimit * 6), 60000), // trần theo IP
    writeLimiter: new S.RateLimiter(cfg.writeLimit, 60000),
    contactLimiter: new S.RateLimiter(cfg.contactLimit, 60000)
  };
  app.gcUploads = function () { return gcUploads(store.data, cfg.uploadsDir); };
  app.gcUploads();
  if (store_dirty) { store.save(); store_dirty = false; }
  require('../routes/auth')(app);
  require('../routes/recipes')(app);
  require('../routes/me')(app);
  require('../routes/reviews')(app);
  require('../routes/ingredients')(app);
  require('../routes/misc')(app);

  async function handleApi(req, res, url) {
    const m = app.router.match(req.method, url.pathname);
    if (!m) throw new HttpError(404, 'Không tìm thấy API này');
    if (m.badRequest) throw new HttpError(400, 'Đường dẫn không hợp lệ');
    if (m.methods) { const e = new HttpError(405, 'Phương thức không được hỗ trợ'); e.headers = { Allow: m.methods.join(', ') }; throw e; }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.headers.origin;
      if (origin && origin !== 'null') {
        let oh = ''; try { oh = new URL(origin).host; } catch (e) { /* ignore */ }
        if (oh !== req.headers.host) throw new HttpError(403, 'Yêu cầu không hợp lệ (nguồn gốc khác)');
      }
    }
    const db = store.data;
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies[S.COOKIE];
    const sess = S.findSession(db, sid);
    const user = sess ? db.users.find((u) => u.id === sess.userId) || null : null;
    const query = {};
    for (const [k, v] of url.searchParams) if (!(k in query)) query[k] = v;
    const ctx = {
      req, res, url, query, params: m.params, app, db, store, user, sid, status: 200, headers: {},
      ip: req.socket.remoteAddress || 'unknown',
      body: (limit) => readJson(req, limit || m.route.opts.limit || 256 * 1024),
      setCookie(v) { this.headers['Set-Cookie'] = v; },
      requireUser() { if (!this.user) throw new HttpError(401, 'Bạn cần đăng nhập để thực hiện thao tác này'); return this.user; }
    };
    const out = await m.route.handler(ctx);
    sendJson(res, ctx.status, out === undefined ? { ok: true } : out, ctx.headers);
  }

  async function handle(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch (e) { return sendJson(res, 400, { error: 'Địa chỉ không hợp lệ' }); }
    const p = url.pathname;
    try {
      if (p === '/api' || p.startsWith('/api/')) return await handleApi(req, res, url);
      if (p.startsWith('/uploads/')) return serveStatic(req, res, cfg.uploadsDir, p.slice('/uploads'.length), { noIndex: true, exts: new Set(['.png', '.jpg', '.jpeg', '.webp']) });
      return serveStatic(req, res, cfg.publicDir, p, {});
    } catch (e) {
      if (e instanceof HttpError) {
        const body = { error: e.message }; if (e.field) body.field = e.field;
        return sendJson(res, e.status, body, e.headers);
      }
      console.error('Lỗi xử lý', req.method, req.url, e && e.stack || e);
      if (!res.headersSent) sendJson(res, 500, { error: 'Đã có lỗi xảy ra phía máy chủ. Vui lòng thử lại sau.' });
      else res.destroy();
    }
  }

  const server = http.createServer((req, res) => { handle(req, res).catch((e) => { console.error(e); try { res.destroy(); } catch (e2) { /* ignore */ } }); });
  server.on('clientError', (err, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); });
  server.requestTimeout = 60000;

  function listen() {
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(cfg.port, cfg.host, () => { server.removeListener('error', reject); resolve(server.address().port); });
    });
  }
  function close() {
    return new Promise((resolve) => {
      store.flush();
      if (server.closeAllConnections) server.closeAllConnections();
      server.close(() => resolve());
    });
  }
  return { app, server, store, cfg, listen, close };
}
module.exports = { createApp, notFound };
