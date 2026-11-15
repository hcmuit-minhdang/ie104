'use strict';
// Chạy một lần: node server/seed/download-images.js
// Tải ảnh từ xa của phat-recipes.json về public/assets/images/recipes/community/<id>.<đuôi> và ghi server/seed/image-map.json.
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'images', 'recipes', 'community');
const MAP_FILE = path.join(__dirname, 'image-map.json');
const EXT = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };

function get(url, redirects) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'NomNomSeedFetcher/1.0 (student project; image localisation)', Accept: 'image/*' }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if ((redirects || 0) >= 6) return reject(new Error('quá nhiều chuyển hướng'));
        return resolve(get(new URL(res.headers.location, url).toString(), (redirects || 0) + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ buf: Buffer.concat(chunks), type: String(res.headers['content-type'] || '').split(';')[0].trim().toLowerCase() }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchRetry(url) {
  let err;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await get(url);
      if (!EXT[r.type]) throw new Error('không phải ảnh: ' + r.type);
      if (r.buf.length < 2048) throw new Error('ảnh quá nhỏ');
      return r;
    } catch (e) { err = e; await sleep(1000 * (i + 1) * (/429/.test(e.message) ? 4 : 1)); }
  }
  throw err;
}

async function main() {
  const p = JSON.parse(fs.readFileSync(path.join(__dirname, 'phat-recipes.json'), 'utf8'));
  const jobs = new Map(); // url -> id
  (function walk(v) {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      if (v.id && v.name && typeof v.image === 'string' && /^https?:/.test(v.image)) { if (!jobs.has(v.image)) jobs.set(v.image, v.id); }
      else Object.values(v).forEach(walk);
    }
  })(p);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let map = {};
  try { map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')); } catch (e) { /* mới */ }
  const queue = Array.from(jobs.entries()).filter(([url]) => !(map[url] && fs.existsSync(path.join(ROOT, 'public', map[url]))));
  let ok = Object.keys(map).length, fail = 0, total = jobs.size;
  const failed = [];
  async function worker() {
    while (queue.length) {
      const [url, id] = queue.shift();
      try {
        const r = await fetchRetry(url);
        const name = id + EXT[r.type];
        fs.writeFileSync(path.join(OUT_DIR, name), r.buf);
        map[url] = '/assets/images/recipes/community/' + name;
        ok++;
      } catch (e) { fail++; failed.push(id + ': ' + e.message); }
      fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 1));
      await sleep(1500);
    }
  }
  await Promise.all(Array.from({ length: 2 }, worker));
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 1));
  console.log('Tổng ' + total + ' ảnh từ xa: thành công ' + ok + ', lỗi ' + fail);
  failed.forEach((f) => console.log('  - ' + f));
}
main().catch((e) => { console.error(e); process.exit(1); });
