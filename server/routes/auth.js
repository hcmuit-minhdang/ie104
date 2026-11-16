'use strict';
const crypto = require('crypto');
const { HttpError } = require('../lib/http');
const V = require('../lib/validate');
const S = require('../lib/session');
const { hashPassword, verifyPassword, fakeVerify } = require('../lib/hash');
const { publicUser } = require('../lib/model');

function secure(req) { return req.headers['x-forwarded-proto'] === 'https'; }
function rateCheck(ctx, ident) {
  const key = ctx.ip + '|' + String(ident == null ? '' : ident).toLowerCase().slice(0, 120);
  const wait = Math.max(ctx.app.ipLimiter.hit(ctx.ip), ctx.app.limiter.hit(key));
  if (wait) { const e = new HttpError(429, 'Bạn thử quá nhiều lần. Vui lòng thử lại sau ' + wait + ' giây.'); e.headers = { 'Retry-After': String(wait) }; throw e; }
}
function lc(s) { return String(s).toLowerCase(); }

// Xóa mọi dữ liệu gắn với một người dùng (dùng khi xóa tài khoản)
function purgeUser(db, uid) {
  db.sessions = db.sessions.filter((s) => s.userId !== uid);
  db.saved = db.saved.filter((s) => s.userId !== uid);
  db.history = db.history.filter((s) => s.userId !== uid);
  db.reviews = db.reviews.filter((r) => r.userId !== uid);
  for (const r of db.reviews) if (r.likedBy) r.likedBy = r.likedBy.filter((x) => x !== uid);
  for (const rec of db.recipes) if (rec.authorId === uid) rec.authorId = null;
  db.users = db.users.filter((u) => u.id !== uid);
}

module.exports = function (app) {
  const r = app.router;

  r.post('/api/auth/register', async (ctx) => {
    if (ctx.app.cfg.demoOnly) throw new HttpError(403, 'Bản demo trực tuyến tạm đóng đăng ký. Hãy đăng nhập bằng tài khoản demo (demo / demo123).');
    const b = await ctx.body();
    rateCheck(ctx, typeof b.username === 'string' ? b.username : '');
    const username = V.checkUsername(b.username);
    const email = V.checkEmail(b.email);
    const password = V.checkPassword(b.password);
    const db = ctx.db;
    if (db.users.some((u) => lc(u.username) === lc(username))) throw new HttpError(409, 'Tên đăng nhập đã được sử dụng', 'username');
    if (db.users.some((u) => lc(u.email) === email)) throw new HttpError(409, 'Email đã được sử dụng', 'email');
    const passwordHash = await hashPassword(password);
    // kiểm tra lại sau await (tránh đua)
    if (db.users.some((u) => lc(u.username) === lc(username))) throw new HttpError(409, 'Tên đăng nhập đã được sử dụng', 'username');
    if (db.users.some((u) => lc(u.email) === email)) throw new HttpError(409, 'Email đã được sử dụng', 'email');
    const user = { id: 'u_' + crypto.randomBytes(6).toString('hex'), username, email, avatar: null, passwordHash, createdAt: new Date().toISOString() };
    db.users.push(user);
    const sid = S.createSession(db, user.id);
    ctx.store.save();
    ctx.setCookie(S.cookieHeader(sid, secure(ctx.req)));
    ctx.status = 201;
    return { user: publicUser(user) };
  });

  r.post('/api/auth/login', async (ctx) => {
    const b = await ctx.body();
    rateCheck(ctx, typeof b.identifier === 'string' ? b.identifier : '');
    const ident = V.str(b.identifier);
    const pw = typeof b.password === 'string' ? b.password : '';
    if (!ident || !pw) throw new HttpError(400, 'Vui lòng nhập tên đăng nhập/email và mật khẩu');
    if (ident.length > 120 || pw.length > 200) throw new HttpError(401, 'Thông tin đăng nhập không đúng');
    const li = lc(ident);
    const user = ctx.db.users.find((u) => lc(u.username) === li || lc(u.email) === li);
    if (!user) { await fakeVerify(pw); throw new HttpError(401, 'Tên đăng nhập/email hoặc mật khẩu không đúng'); }
    if (!(await verifyPassword(pw, user.passwordHash))) throw new HttpError(401, 'Tên đăng nhập/email hoặc mật khẩu không đúng');
    if (ctx.sid) S.destroySession(ctx.db, ctx.sid);
    S.purgeExpired(ctx.db);
    const sid = S.createSession(ctx.db, user.id);
    ctx.store.save();
    ctx.setCookie(S.cookieHeader(sid, secure(ctx.req)));
    return { user: publicUser(user) };
  });

  r.post('/api/auth/logout', async (ctx) => {
    if (ctx.sid) { S.destroySession(ctx.db, ctx.sid); ctx.store.save(); }
    ctx.setCookie(S.clearCookieHeader());
    return { ok: true };
  });

  r.get('/api/me', (ctx) => ({ user: publicUser(ctx.user) }));

  r.patch('/api/me', async (ctx) => {
    const user = ctx.requireUser();
    const b = await ctx.body();
    if (typeof b.currentPassword !== 'string' || !b.currentPassword) throw new HttpError(400, 'Vui lòng nhập mật khẩu hiện tại', 'currentPassword');
    if (!(await verifyPassword(b.currentPassword, user.passwordHash))) throw new HttpError(403, 'Mật khẩu hiện tại không đúng', 'currentPassword');
    const upd = {};
    if (b.username !== undefined) {
      upd.username = V.checkUsername(b.username);
      if (ctx.db.users.some((u) => u.id !== user.id && lc(u.username) === lc(upd.username))) throw new HttpError(409, 'Tên đăng nhập đã được sử dụng', 'username');
    }
    if (b.email !== undefined) {
      upd.email = V.checkEmail(b.email);
      if (ctx.db.users.some((u) => u.id !== user.id && lc(u.email) === upd.email)) throw new HttpError(409, 'Email đã được sử dụng', 'email');
    }
    if (b.newPassword !== undefined) { V.checkPassword(b.newPassword, 'newPassword'); upd.passwordHash = await hashPassword(b.newPassword); }
    if (b.avatar !== undefined) {
      if (b.avatar !== null && !(typeof b.avatar === 'string' && /^\/(uploads|assets)\/[\w\-./]{1,200}$/.test(b.avatar) && !b.avatar.includes('..'))) throw new HttpError(400, 'Ảnh đại diện không hợp lệ', 'avatar');
      upd.avatar = b.avatar;
    }
    Object.assign(user, upd);
    if (upd.passwordHash) S.revokeOthers(ctx.db, user.id, ctx.sid);
    ctx.store.save();
    return { user: publicUser(user) };
  });

  r.delete('/api/me', async (ctx) => {
    const user = ctx.requireUser();
    const b = await ctx.body();
    if (typeof b.password !== 'string' || !b.password) throw new HttpError(400, 'Vui lòng nhập mật khẩu để xác nhận', 'password');
    if (!(await verifyPassword(b.password, user.passwordHash))) throw new HttpError(403, 'Mật khẩu không đúng', 'password');
    purgeUser(ctx.db, user.id);
    ctx.store.save();
    ctx.setCookie(S.clearCookieHeader());
    return { ok: true };
  });
};
