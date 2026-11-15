'use strict';
class HttpError extends Error {
  constructor(status, message, field) { super(message); this.status = status; this.field = field; }
}
const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json'
};
function sendJson(res, status, obj, headers) {
  if (res.headersSent) return;
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }, headers || {}));
  res.end(body);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const len = Number(req.headers['content-length']);
    if (len > limit) { req.resume(); return reject(new HttpError(413, 'Dữ liệu gửi lên quá lớn')); }
    const chunks = []; let size = 0; let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > limit) { done = true; chunks.length = 0; reject(new HttpError(413, 'Dữ liệu gửi lên quá lớn')); req.resume(); return; }
      chunks.push(c);
    });
    req.on('end', () => { if (!done) { done = true; resolve(Buffer.concat(chunks).toString('utf8')); } });
    req.on('error', () => { if (!done) { done = true; reject(new HttpError(400, 'Không đọc được dữ liệu gửi lên')); } });
    req.on('aborted', () => { if (!done) { done = true; reject(new HttpError(400, 'Kết nối bị ngắt')); } });
  });
}
async function readJson(req, limit) {
  const raw = await readBody(req, limit);
  if (!raw.trim()) return {};
  let v;
  try { v = JSON.parse(raw); } catch (e) { throw new HttpError(400, 'Dữ liệu JSON không hợp lệ'); }
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, 'Dữ liệu gửi lên phải là một đối tượng JSON');
  return v;
}
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k || k in out) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { out[k] = part.slice(i + 1).trim(); }
  }
  return out;
}
module.exports = { HttpError, MIME, sendJson, readBody, readJson, parseCookies };
