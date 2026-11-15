'use strict';
const crypto = require('crypto');

const COOKIE = 'nomnom_sid';
const MAX_AGE = 30 * 24 * 3600; // giây

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function createSession(db, userId) {
  const sid = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.sessions.push({ id: sha(sid), userId, createdAt: now, expiresAt: now + MAX_AGE * 1000 });
  return sid;
}
function findSession(db, sid) {
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
