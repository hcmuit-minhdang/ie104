'use strict';
const fs = require('fs');
const path = require('path');
const { MIME } = require('./http');

const CSP = "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'";
const NO_CACHE = new Set(['.html', '.htm', '.js', '.mjs', '.css']);

function notFound(res, method) {
  const body = '<!doctype html><meta charset="utf-8"><title>404</title><h1>404</h1><p>Không tìm thấy trang.</p>';
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'X-Content-Type-Options': 'nosniff' });
  res.end(method === 'HEAD' ? undefined : body);
}

// Trả file tĩnh từ root. mountPath đã bị cắt khỏi pathname. opts.exts: giới hạn đuôi file (cho uploads).
function serveStatic(req, res, root, pathname, opts) {
  opts = opts || {};
  const method = req.method;
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e) { return notFound(res, method); }
  if (rel.indexOf('\0') >= 0 || rel.indexOf('\\') >= 0) return notFound(res, method);
  const segs = rel.split('/').filter(Boolean);
  for (const s of segs) if (s === '..' || s === '.' || s.startsWith('.')) return notFound(res, method);
  const rootAbs = path.resolve(root);
  let target = path.resolve(rootAbs, segs.join(path.sep));
  if (target !== rootAbs && !target.startsWith(rootAbs + path.sep)) return notFound(res, method);
  let st;
  try { st = fs.statSync(target); } catch (e) { return notFound(res, method); }
  if (st.isDirectory()) {
    if (opts.noIndex) return notFound(res, method);
    target = path.join(target, 'index.html');
    try { st = fs.statSync(target); } catch (e) { return notFound(res, method); }
  }
  if (!st.isFile()) return notFound(res, method);
  let real;
  try { real = fs.realpathSync(target); const rr = fs.realpathSync(rootAbs); if (real !== rr && !real.startsWith(rr + path.sep)) return notFound(res, method); } catch (e) { return notFound(res, method); }
  const ext = path.extname(target).toLowerCase();
  if (opts.exts && !opts.exts.has(ext)) return notFound(res, method);
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': st.size,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': NO_CACHE.has(ext) ? 'no-cache' : 'public, max-age=3600',
    'Last-Modified': st.mtime.toUTCString()
  };
  if (ext === '.html' || ext === '.htm') headers['Content-Security-Policy'] = CSP;
  if (req.headers['if-modified-since'] && !NO_CACHE.has(ext)) {
    const t = Date.parse(req.headers['if-modified-since']);
    if (!isNaN(t) && Math.floor(st.mtimeMs / 1000) * 1000 <= t) { res.writeHead(304, { 'Cache-Control': headers['Cache-Control'] }); return res.end(); }
  }
  res.writeHead(200, headers);
  if (method === 'HEAD') return res.end();
  const stream = fs.createReadStream(target);
  stream.on('error', () => { res.destroy(); });
  stream.pipe(res);
}
module.exports = { serveStatic, notFound };
