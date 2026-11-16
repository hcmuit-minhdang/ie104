'use strict';
const crypto = require('crypto');

const COOKIE = 'nomnom_sid';
const MAX_AGE = 30 * 24 * 3600; // giây

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Chế độ phiên "không trạng thái" (dùng trên Vercel khi chưa có Redis): token tự ký bằng HMAC nên instance nào cũng
// xác thực được, không cần lưu phiên trong CSDL. Bật bằng biến môi trường NOMNOM_STATELESS_SESSIONS=1.
const stateless = () => process.env.NOMNOM_STATELESS_SESSIONS === '1';
const secret = () => (process.env.NOMNOM_SESSION_SECRET || 'nomnom-stateless') + '|' + (process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_PROJECT_ID || 'local');
const sign = (body) => crypto.createHmac('sha256', secret()).update(body).digest('base64url');

function createSession(db, userId) {
  if (stateless()) {
    const body = 'v1.' + Buffer.from(userId).toString('base64url') + '.' + (Date.now() + MAX_AGE * 1000);
    return body + '.' + sign(body);
  }
  const sid = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.sessions.push({ id: sha(sid), userId, createdAt: now, expiresAt: now + MAX_AGE * 1000 });
  return sid;
}
function findSession(db, sid) {
  if (typeof sid === 'string' && sid.startsWith('v1.')) {
    if (!stateless()) return null;
    const i = sid.lastIndexOf('.'), body = sid.slice(0, i), mac = sid.slice(i + 1);
    const want = sign(body);
    if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
    const parts = body.split('.');
    const exp = Number(parts[2]);
    if (!(exp > Date.now())) return null;
    return { id: 'stateless', userId: Buffer.from(parts[1], 'base64url').toString(), createdAt: exp - MAX_AGE * 1000, expiresAt: exp };
  }
  if (!sid || typeof sid !== 'string' || sid.length !== 64) return null;
  const h = sha(sid);
  const s = db.sessions.find((x) => x.id === h);
  if (!s) return null;
  if (s.expiresAt < Date.now()) return null;
  return s;
}
function destroySession(db, sid) {
  if (!sid) return;
  const h = sha(sid);
  db.sessions = db.sessions.filter((x) => x.id !== h);
}
function purgeExpired(db) {
  const now = Date.now();
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((x) => x.expiresAt >= now);
  return before !== db.sessions.length;
}
function cookieHeader(sid, secure) {
  return COOKIE + '=' + sid + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + MAX_AGE + (secure ? '; Secure' : '');
}
function clearCookieHeader() {
  return COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

// Giới hạn tần suất theo IP (cửa sổ trượt 60 giây).
class RateLimiter {
  constructor(max, windowMs) { this.max = max; this.windowMs = windowMs || 60000; this.hits = new Map(); }
  // trả về số giây cần chờ nếu bị chặn, ngược lại 0
  hit(key) {
    const now = Date.now();
    const arr = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.max) { this.hits.set(key, arr); return Math.ceil((this.windowMs - (now - arr[0])) / 1000); }
    arr.push(now); this.hits.set(key, arr);
    if (this.hits.size > 5000) for (const [k, v] of this.hits) if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k);
    return 0;
  }
}
function revokeOthers(db, userId, keepSid) {
  const keep = keepSid ? sha(keepSid) : null;
  db.sessions = db.sessions.filter((s) => s.userId !== userId || s.id === keep);
}
module.exports = { revokeOthers, COOKIE, MAX_AGE, createSession, findSession, destroySession, purgeExpired, cookieHeader, clearCookieHeader, RateLimiter };
