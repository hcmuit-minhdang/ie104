'use strict';
const crypto = require('crypto');
const { HttpError } = require('../lib/http');
const V = require('../lib/validate');
const M = require('../lib/model');

module.exports = function (app) {
  const r = app.router;

  r.post('/api/contact', async (ctx) => {
    const wait = app.contactLimiter.hit(ctx.ip);
    if (wait) { const e = new HttpError(429, 'Bạn gửi quá nhiều tin nhắn. Vui lòng thử lại sau ' + wait + ' giây.'); e.headers = { 'Retry-After': String(wait) }; throw e; }
    const b = await ctx.body();
    const name = V.str(b.name);
    if (!name || name.length > 100) throw new HttpError(400, 'Vui lòng nhập họ tên (tối đa 100 ký tự)', 'name');
    const email = V.checkEmail(b.email);
    const message = V.str(b.message);
    if (message.length < 5 || message.length > 5000) throw new HttpError(400, 'Nội dung cần từ 5 đến 5000 ký tự', 'message');
    ctx.db.contacts.push({ id: 'ct_' + crypto.randomBytes(5).toString('hex'), name, email, message, createdAt: new Date().toISOString() });
    if (ctx.db.contacts.length > 2000) ctx.db.contacts.shift();
    ctx.store.save();
    ctx.status = 201;
    return { ok: true };
  });


  // Bảng vinh danh trang chủ: nhiều công thức nhất / nhiều đánh giá nhất / công thức được lưu nhiều nhất.
  r.get('/api/leaderboard', (ctx) => {
    const db = ctx.db;
    const byId = new Map(db.users.map((u) => [u.id, u]));
    function top(counter) {
      let best = null;
      counter.forEach((n, id) => {
        const u = byId.get(id);
        if (u && (!best || n > best.count)) best = { id: u.id, username: u.username, avatar: u.avatar || null, count: n };
      });
      return best;
    }
    const uploads = new Map(), reviews = new Map(), saves = new Map();
    db.recipes.forEach((x) => { if (x.authorId) uploads.set(x.authorId, (uploads.get(x.authorId) || 0) + 1); });
    db.reviews.forEach((x) => { reviews.set(x.userId, (reviews.get(x.userId) || 0) + 1); });
    db.saved.forEach((x) => { saves.set(x.recipeId, (saves.get(x.recipeId) || 0) + 1); });
    let bestRecipe = null;
    saves.forEach((n, id) => {
      const rec = db.recipes.find((x) => x.id === id);
      if (rec && (!bestRecipe || n > bestRecipe.saves)) bestRecipe = { id: rec.id, name: rec.name, saves: n, author: rec.authorId && byId.get(rec.authorId) ? { id: rec.authorId, username: byId.get(rec.authorId).username } : null };
    });
    return { mostRecipes: top(uploads), mostReviews: top(reviews), mostSaved: bestRecipe };
  });

  r.get('/api/health', (ctx) => ({ ok: true, recipes: ctx.db.recipes.length }));
};
