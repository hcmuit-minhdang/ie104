'use strict';
// Điểm vào cho Vercel (serverless): mọi /api/* và /uploads/* đi qua hàm này, file tĩnh do CDN của Vercel phục vụ từ public/.
//
// Vercel chạy nhiều "instance" tách biệt và hệ thống file chỉ ghi được ở /tmp, nên một CSDL JSON cục bộ KHÔNG đủ:
// đăng ký ở instance A thì instance B không thấy tài khoản -> đăng nhập thất bại.
// Vì vậy khi có biến môi trường của Redis (Upstash / Vercel KV):
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN   (hoặc KV_REST_API_URL + KV_REST_API_TOKEN)
// hàm này đồng bộ phần dữ liệu có thể thay đổi (tài khoản, phiên, lưu, đánh giá, lịch sử, công thức người dùng đăng,
// ảnh tải lên) vào Redis: kéo về trước mỗi request và đẩy lên trước khi trả lời nếu có thay đổi.
// Không có Redis thì chạy như cũ (dữ liệu ở /tmp, chỉ ổn định trong một instance).
const os = require('os');
const fs = require('fs');
const path = require('path');
const { createApp } = require('../server/lib/app');

const KEY = 'nomnom:state:v1';
const IMG_PREFIX = 'nomnom:img:';
const COLLECTIONS = ['users', 'sessions', 'saved', 'reviews', 'history', 'contacts', 'uploads'];

function redisConfig(env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || '';
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || '';
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

async function redisCmd(cfg, args) {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error('Redis: ' + (j.error || res.status));
  return j.result;
}

function createHandler(opts) {
  opts = opts || {};
  const env = opts.env || process.env;
  const tmp = opts.tmpDir || os.tmpdir();
  const cfg = redisConfig(env);
  const uploadsDir = path.join(tmp, 'nomnom-uploads');
  let inst = null, baseIds = null, baseRecipes = null;
  let dirty = false;
  let chain = Promise.resolve();   // xử lý tuần tự trong một instance để không ghi đè lẫn nhau

  function init() {
    if (inst) return;
    inst = createApp({
      dbFile: path.join(tmp, 'nomnom-db.json'),
      uploadsDir,
      publicDir: path.join(__dirname, '..', 'public'),
      quiet: true
    });
    baseRecipes = inst.store.data.recipes.filter((r) => !r._userAdded);
    baseIds = new Set(baseRecipes.map((r) => r.id));
    // Mọi lần lưu (save/saveSoon) đều đánh dấu "bẩn" để đẩy lên Redis trước khi trả lời.
    const save = inst.store.save.bind(inst.store), soon = inst.store.saveSoon.bind(inst.store);
    inst.store.save = () => { dirty = true; try { save(); } catch (e) { /* /tmp không ghi được thì bỏ qua */ } };
    inst.store.saveSoon = () => { dirty = true; try { soon(); } catch (e) { /* bỏ qua */ } };
  }

  async function pull() {
    if (!cfg) return;
    const raw = await redisCmd(cfg, ['GET', KEY]);
    if (!raw) return;                       // chưa có trạng thái -> giữ dữ liệu mẫu
    const st = JSON.parse(raw), d = inst.store.data;
    for (const k of COLLECTIONS) d[k] = Array.isArray(st[k]) ? st[k] : [];
    const del = new Set(st.deletedSeed || []);
    d.recipes = baseRecipes.filter((r) => !del.has(r.id)).concat(st.userRecipes || []);
  }

  async function push() {
    if (!cfg || !dirty) return;
    const d = inst.store.data, st = {};
    for (const k of COLLECTIONS) st[k] = d[k] || [];
    st.userRecipes = d.recipes.filter((r) => !baseIds.has(r.id));
    const have = new Set(d.recipes.map((r) => r.id));
    st.deletedSeed = [...baseIds].filter((id) => !have.has(id));
    await redisCmd(cfg, ['SET', KEY, JSON.stringify(st)]);
    dirty = false;
  }

  // Ảnh tải lên: lưu bản sao vào Redis (nếu <= ~700KB) để instance khác cũng phục vụ được.
  async function pushImage(file) {
    if (!cfg) return;
    try {
      const buf = fs.readFileSync(path.join(uploadsDir, file));
      if (buf.length <= 700 * 1024) await redisCmd(cfg, ['SET', IMG_PREFIX + file, buf.toString('base64')]);
    } catch (e) { /* bỏ qua */ }
  }
  async function ensureImage(file) {
    if (!cfg || !/^[\w.-]+$/.test(file)) return;
    const p = path.join(uploadsDir, file);
    if (fs.existsSync(p)) return;
    try {
      const b64 = await redisCmd(cfg, ['GET', IMG_PREFIX + file]);
      if (b64) { fs.mkdirSync(uploadsDir, { recursive: true }); fs.writeFileSync(p, Buffer.from(b64, 'base64')); }
    } catch (e) { /* bỏ qua */ }
  }

  async function run(req, res) {
    init();
    const url = req.url || '';
    try {
      if (cfg) {
        await pull();
        if (url.startsWith('/uploads/')) await ensureImage(decodeURIComponent(url.slice('/uploads/'.length).split('?')[0]));
      }
    } catch (e) { console.error('Đồng bộ Redis (kéo) lỗi:', e.message); }

    // Trì hoãn res.end tới khi đã đẩy thay đổi lên Redis (serverless có thể bị đóng băng ngay sau khi trả lời).
    const origEnd = res.end.bind(res);
    let ended = false;
    res.end = function (...args) {
      if (ended) return res;
      ended = true;
      (async () => {
        try {
          if (cfg && req.method === 'POST' && url.split('?')[0] === '/api/uploads' && res.statusCode < 300) {
            const m = /"url":"\/uploads\/([^"]+)"/.exec(String(args[0] || ''));
            if (m) await pushImage(m[1]);
          }
          await push();
        } catch (e) { console.error('Đồng bộ Redis (đẩy) lỗi:', e.message); }
        origEnd(...args);
      })();
      return res;
    };
    inst.server.emit('request', req, res);
    await new Promise((resolve) => { res.on('close', resolve); res.on('finish', resolve); });
  }

  const handler = (req, res) => {
    const job = chain.then(() => run(req, res));
    chain = job.catch(() => {});
    return job;
  };
  handler.createHandler = createHandler;
  handler.redisConfig = redisConfig;
  return handler;
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
