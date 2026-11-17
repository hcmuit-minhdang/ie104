'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { HttpError } = require('../lib/http');
const V = require('../lib/validate');
const M = require('../lib/model');
const { norm, slugify } = require('../lib/text');
const { findByName, catalog } = require('../lib/catalog');

const SORTS = new Set(['rating', 'time', 'price', 'new']);
// Tên 7 nhóm bộ lọc của trang Danh mục; mỗi nhóm là một tham số trên URL, giá trị là các nhãn cách nhau bằng dấu phẩy.
const TAG_GROUPS = ['dam', 'tinh-bot', 'rau-cu', 'trai-cay', 'che-do-an', 'vung-mien', 'ngan-sach'];
const IMG_RE = /^(\/(uploads|assets)\/[\w\-./%]{1,300}|https?:\/\/[^\s"'<>]{1,500})$/;
const FORBIDDEN_KEYS = new Set(['id', 'authorId', 'author', 'rating', 'ratingCount', 'ratingScore', 'reviewCount', 'seedRating', 'seedCount', 'main', 'legacyId', 'createdAt', 'saved', '__proto__', 'constructor', 'prototype']);

function cleanStr(v, max, field, required) {
  const s = typeof v === 'string' ? v.trim() : (typeof v === 'number' ? String(v) : '');
  if (!s) { if (required) throw new HttpError(400, 'Thiếu thông tin bắt buộc', field); return ''; }
  if (s.length > max) throw new HttpError(400, 'Nội dung quá dài (tối đa ' + max + ' ký tự)', field);
  return s;
}
function checkImage(v, field) {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v !== 'string' || !IMG_RE.test(v) || v.includes('..')) throw new HttpError(400, 'Đường dẫn ảnh không hợp lệ', field);
  return v;
}
function numField(v, field, def, min, max) {
  if (v === undefined || v === null || v === '') return def;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, 'Giá trị "' + field + '" không hợp lệ', field);
  return n;
}

const NUTRI_KEYS = ['servings', 'calories', 'carbs', 'protein', 'fat', 'sodium', 'fiber'];
function cleanNutrition(n) {
  const out = { servings: 1 };
  if (n && typeof n === 'object' && !Array.isArray(n)) for (const k of NUTRI_KEYS) {
    const v = n[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string' && v.trim() && v.length <= 40) out[k] = v.trim();
  }
  return out;
}

function buildRecipe(b, userId, db) {
  const name = cleanStr(b.name || b.title, 120, 'name', true);
  if (name.length < 3) throw new HttpError(400, 'Tên món cần ít nhất 3 ký tự', 'name');
  const description = cleanStr(b.description, 5000, 'description');
  const image = checkImage(b.image, 'image') || '/assets/images/recipes/bo-kho/placeholder.svg';
  const time = numField(b.time, 'time', 30, 1, 1440);
  const servings = numField(b.servings !== undefined ? b.servings : b.baseServings, 'servings', 2, 1, 100);
  let category = (typeof b.category === 'string' ? b.category.trim() : '').slice(0, 60) || 'Món khác';
  { // slug/id danh mục -> tên danh mục đã có
    const nc = norm(category), sc = slugify(category);
    const hit = db.recipes.find((r) => norm(r.category) === nc || slugify(r.category) === sc);
    if (hit) category = hit.category;
  }
  if (!Array.isArray(b.ingredients) || !b.ingredients.length) throw new HttpError(400, 'Cần ít nhất một nguyên liệu', 'ingredients');
  if (b.ingredients.length > 100) throw new HttpError(400, 'Quá nhiều nguyên liệu', 'ingredients');
  const ingredients = b.ingredients.map((x) => {
    if (!x || typeof x !== 'object') throw new HttpError(400, 'Nguyên liệu không hợp lệ', 'ingredients');
    const nm = cleanStr(x.name, 80, 'ingredients', true);
    const qty = x.quantity !== undefined ? x.quantity : x.qty;
    const q = qty === undefined || qty === '' || qty === null ? '' : (Number.isFinite(Number(qty)) ? Number(qty) : cleanStr(qty, 20, 'ingredients'));
    const known = findByName(nm, true);
    const cid = typeof x.ingredientId === 'string' && catalog.byId.has(x.ingredientId) ? x.ingredientId : null;
    const out = { ingredientId: cid || (known ? known.id : (slugify(nm) || 'nguyen-lieu')), name: nm, qty: q, unit: cleanStr(x.unit, 20, 'ingredients') };
    const note = cleanStr(x.note, 120, 'ingredients'); if (note) out.note = note;
    return out;
  });
  if (!Array.isArray(b.steps) || !b.steps.length) throw new HttpError(400, 'Cần ít nhất một bước thực hiện', 'steps');
  if (b.steps.length > 60) throw new HttpError(400, 'Quá nhiều bước', 'steps');
  const steps = b.steps.map((s) => {
    const o = typeof s === 'string' ? { text: s } : s;
    if (!o || typeof o !== 'object') throw new HttpError(400, 'Bước thực hiện không hợp lệ', 'steps');
    const raw = Array.isArray(o.text) ? o.text.join('\n') : o.text;
    const text = cleanStr(raw, 3000, 'steps', true);
    const imgs = [];
    if (o.image) imgs.push(checkImage(o.image, 'steps'));
    if (Array.isArray(o.images)) for (const im of o.images.slice(0, 6)) imgs.push(checkImage(im, 'steps'));
    return { text: text.split(/\n+/).map((t) => t.trim()).filter(Boolean), images: Array.from(new Set(imgs.filter(Boolean))) };
  });
  const gallery = [image];
  for (const arr of [b.gallery, b.images]) if (Array.isArray(arr)) for (const g of arr.slice(0, 8)) { const x = checkImage(g, 'gallery'); if (x && !gallery.includes(x)) gallery.push(x); }
  const price = numField(b.price, 'price', numField(b.costTotal, 'costTotal', 0, 0, 1e9) / servings, 0, 1e8);
  const rec = {}; // chỉ nhận các trường trong danh sách cho phép (không giữ trường lạ)
  let id = slugify(name) || 'cong-thuc';
  const taken = new Set(db.recipes.map((r) => r.id));
  id = id.slice(0, 60) + '-' + crypto.randomBytes(3).toString('hex');
  while (taken.has(id)) id = id.slice(0, 60) + '-' + crypto.randomBytes(3).toString('hex');
  const prep = Math.max(1, Math.round(time * 0.3));
  const d = new Date();
  const prepIn = b.prepTime !== undefined && b.prepTime !== null && b.prepTime !== '' ? numField(b.prepTime, 'prepTime', 0, 0, 1440) : null;
  const cookIn = b.cookTime !== undefined && b.cookTime !== null && b.cookTime !== '' ? numField(b.cookTime, 'cookTime', 0, 0, 1440) : null;
  const quickIn = Array.isArray(b.quickSteps) && b.quickSteps.length ? b.quickSteps.slice(0, 60).map((q) => cleanStr(q, 1000, 'quickSteps')).filter(Boolean) : null;
  const tags = Array.isArray(b.tags) ? b.tags.filter((t) => typeof t === 'string').slice(0, 10).map((t) => t.slice(0, 40)) : [category];
  return Object.assign(rec, {
    id, name, title: name, category, categoryGroup: 'Công thức cộng đồng', subcategory: '',
    description, summary: ((typeof b.summary === 'string' ? b.summary.trim() : '') || description).slice(0, 500), image, gallery, price: Math.round(price), time,
    prepTime: prepIn !== null ? prepIn : Math.min(prep, time), cookTime: cookIn !== null ? cookIn : Math.max(0, time - prep), baseServings: servings, costTotal: Math.round(price * servings),
    ingredients, quickSteps: quickIn && quickIn.length ? quickIn : steps.map((s) => s.text.join(' ')), steps,
    nutrition: cleanNutrition(b.nutrition),
    similar: [], tags, uploaded: String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(),
    authorId: userId, createdAt: d.toISOString(), seedRating: 0, seedCount: 0, main: ingredients.map((i) => i.ingredientId).slice(0, 6)
  });
}

const MAGIC = {
  png: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  jpeg: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
};

module.exports = function (app) {
  const r = app.router;
  function writeLimit(ctx) {
    const wait = app.writeLimiter.hit(ctx.user ? 'u:' + ctx.user.id : 'ip:' + ctx.ip);
    if (wait) { const e = new HttpError(429, 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ' + wait + ' giây.'); e.headers = { 'Retry-After': String(wait) }; throw e; }
  }
  app.writeLimit = writeLimit;

  r.get('/api/recipes', (ctx) => {
    const q = ctx.query;
    const c = M.makeCtx(ctx.db, ctx.user);
    const maxTime = V.numParam(q, 'maxTime');
    const maxPrice = V.numParam(q, 'maxPrice');
    const sort = q.sort === undefined || q.sort === '' ? null : q.sort;
    if (sort && !SORTS.has(sort)) throw new HttpError(400, 'Giá trị sort không hợp lệ (rating|time|price|new)', 'sort');
    const terms = norm(q.q || '').split(' ').filter(Boolean).slice(0, 8);
    const cat = q.category ? norm(q.category) : '';
    // Bộ lọc theo nhóm (Đạm, Tinh bột, ...): trong một nhóm chỉ cần khớp MỘT nhãn, giữa các nhóm phải khớp TẤT CẢ.
    const groups = TAG_GROUPS
      .map((g) => String(q[g] || '').split(',').map((t) => norm(t)).filter(Boolean).slice(0, 12))
      .filter((g) => g.length);
    let list = ctx.db.recipes.filter((rec) => {
      if (cat && norm(rec.category) !== cat && slugify(rec.category) !== cat) return false;
      if (groups.length) {
        const have = new Set((rec.tags || []).map((t) => norm(t)));
        for (const g of groups) if (!g.some((t) => have.has(t))) return false;
      }
      if (maxTime !== null && rec.time > maxTime) return false;
      if (maxPrice !== null && rec.price > maxPrice) return false;
      if (terms.length) { const s = M.searchText(rec); for (const t of terms) if (!s.includes(t)) return false; }
      return true;
    });
    const rate = new Map(list.map((rec) => [rec.id, M.ratingOf(c, rec)]));
    const rel = new Map();
    if (terms.length) {
      const full = terms.join(' ');
      for (const rec of list) { const n = norm(rec.name); rel.set(rec.id, n === full ? 0 : n.startsWith(full) ? 1 : n.includes(full) ? 2 : 3); }
    }
    const byRating = (a, b) => rate.get(b.id).rating - rate.get(a.id).rating || rate.get(b.id).ratingCount - rate.get(a.id).ratingCount;
    const tie = (a, b) => (a.id < b.id ? -1 : 1);
    list.sort((a, b) => {
      if (sort === 'time') return a.time - b.time || byRating(a, b) || tie(a, b);
      if (sort === 'price') return a.price - b.price || byRating(a, b) || tie(a, b);
      if (sort === 'new') return (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0) || tie(a, b);
      if (!sort && terms.length) return rel.get(a.id) - rel.get(b.id) || byRating(a, b) || tie(a, b);
      return byRating(a, b) || tie(a, b);
    });
    const p = V.paginate(list, q);
    return { items: p.slice.map((rec) => Object.assign(M.cardOf(c, rec), { tags: rec.tags || [] })), total: p.total, page: p.page, pages: p.pages };
  });

  r.get('/api/categories', (ctx) => ({ items: M.categoriesOf(ctx.db) }));

  r.get('/api/recipes/:id', (ctx) => {
    const c = M.makeCtx(ctx.db, ctx.user);
    const rec = c.recipes.get(ctx.params.id);
    if (!rec) throw new HttpError(404, 'Không tìm thấy công thức');
    if (ctx.user) {
      const h = ctx.db.history;
      const uid = ctx.user.id;
      for (let i = h.length - 1; i >= 0; i--) if (h[i].userId === uid && h[i].recipeId === rec.id) h.splice(i, 1);
      h.push({ userId: uid, recipeId: rec.id, at: new Date().toISOString() });
      const mine = h.filter((x) => x.userId === uid);
      if (mine.length > 200) { const drop = new Set(mine.slice(0, mine.length - 200)); ctx.db.history = h.filter((x) => !drop.has(x)); }
      ctx.store.saveSoon();
    }
    return M.detailOf(c, rec);
  });

  r.post('/api/recipes', async (ctx) => {
    const user = ctx.requireUser();
    writeLimit(ctx);
    const b = await ctx.body(1024 * 1024);
    const rec = buildRecipe(b, user.id, ctx.db);
    ctx.db.recipes.push(rec);
    ctx.store.save();
    ctx.status = 201;
    return { id: rec.id };
  });

  r.delete('/api/recipes/:id', (ctx) => {
    const user = ctx.requireUser();
    const db = ctx.db;
    const i = db.recipes.findIndex((x) => x.id === ctx.params.id);
    if (i < 0) throw new HttpError(404, 'Không tìm thấy công thức');
    const rec = db.recipes[i];
    if (rec.authorId !== user.id) throw new HttpError(403, 'Bạn chỉ có thể xóa công thức do chính mình đăng');
    db.recipes.splice(i, 1);
    db.saved = db.saved.filter((x) => x.recipeId !== rec.id);
    db.reviews = db.reviews.filter((x) => x.recipeId !== rec.id);
    db.history = db.history.filter((x) => x.recipeId !== rec.id);
    // xóa ảnh đã tải lên nếu không còn ai dùng
    const files = new Set([rec.image].concat(rec.gallery || []).concat((rec.steps || []).flatMap((s) => s.images || [])));
    for (const f of files) {
      if (typeof f !== 'string' || !f.startsWith('/uploads/')) continue;
      if (!db.uploads.some((x) => x.file === path.basename(f) && x.userId === user.id)) continue;
      const used = db.users.some((u) => u.avatar === f) || db.recipes.some((o) => o.image === f || (o.gallery || []).includes(f) || (o.steps || []).some((s) => (s.images || []).includes(f)));
      if (!used) { try { fs.unlinkSync(path.join(ctx.app.cfg.uploadsDir, path.basename(f))); } catch (e) { /* ignore */ } db.uploads = db.uploads.filter((x) => x.file !== path.basename(f)); }
    }
    ctx.store.save();
    return { ok: true };
  });

  r.post('/api/uploads', async (ctx) => {
    const upUser = ctx.requireUser();
    writeLimit(ctx);
    if (ctx.db.uploads.filter((x) => x.userId === upUser.id).length >= ctx.app.cfg.uploadQuota) throw new HttpError(429, 'Bạn đã đạt giới hạn ' + ctx.app.cfg.uploadQuota + ' ảnh tải lên');
    const b = await ctx.body(4.5 * 1024 * 1024);
    const m = typeof b.dataUrl === 'string' && /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(b.dataUrl);
    if (!m) throw new HttpError(400, 'Ảnh không hợp lệ (chỉ nhận PNG, JPEG hoặc WebP dạng data URL)', 'dataUrl');
    const buf = Buffer.from(m[2].replace(/\s+/g, ''), 'base64');
    if (!buf.length) throw new HttpError(400, 'Ảnh rỗng', 'dataUrl');
    if (buf.length > 3 * 1024 * 1024) throw new HttpError(413, 'Ảnh quá lớn (tối đa 3 MB)', 'dataUrl');
    if (!MAGIC[m[1]](buf)) throw new HttpError(400, 'Nội dung ảnh không khớp định dạng khai báo', 'dataUrl');
    const file = crypto.randomBytes(12).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
    fs.mkdirSync(ctx.app.cfg.uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(ctx.app.cfg.uploadsDir, file), buf);
    ctx.db.uploads.push({ file, userId: upUser.id, at: new Date().toISOString() });
    ctx.store.save();
    return { url: '/uploads/' + file };
  });
};
