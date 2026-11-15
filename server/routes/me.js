'use strict';
const { HttpError } = require('../lib/http');
const V = require('../lib/validate');
const M = require('../lib/model');

module.exports = function (app) {
  const r = app.router;

  function savedList(c) {
    return c.db.saved.filter((s) => s.userId === c.user.id).sort((a, b) => (a.at < b.at ? 1 : -1))
      .map((s) => c.recipes.get(s.recipeId)).filter(Boolean);
  }
  function uploadedList(c) {
    return c.db.recipes.filter((x) => x.authorId === c.user.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  function historyList(c) {
    return c.db.history.filter((h) => h.userId === c.user.id).sort((a, b) => (a.at < b.at ? 1 : -1))
      .map((h) => ({ rec: c.recipes.get(h.recipeId), at: h.at })).filter((x) => x.rec);
  }
  function reviewList(c) {
    return c.db.reviews.filter((x) => x.userId === c.user.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  function ctxOf(ctx) { ctx.requireUser(); return M.makeCtx(ctx.db, ctx.user); }

  r.get('/api/me/saved', (ctx) => {
    const c = ctxOf(ctx);
    const p = V.paginate(savedList(c), ctx.query);
    return { items: p.slice.map((x) => M.cardOf(c, x)), total: p.total, page: p.page, pages: p.pages };
  });
  r.get('/api/me/uploaded', (ctx) => {
    const c = ctxOf(ctx);
    const p = V.paginate(uploadedList(c), ctx.query);
    return { items: p.slice.map((x) => M.cardOf(c, x)), total: p.total, page: p.page, pages: p.pages };
  });
  r.get('/api/me/history', (ctx) => {
    const c = ctxOf(ctx);
    const p = V.paginate(historyList(c), ctx.query);
    return { items: p.slice.map((x) => Object.assign(M.cardOf(c, x.rec), { viewedAt: x.at })), total: p.total, page: p.page, pages: p.pages };
  });
  r.delete('/api/me/history', (ctx) => {
    const user = ctx.requireUser();
    ctx.db.history = ctx.db.history.filter((h) => h.userId !== user.id);
    ctx.store.save();
    return { ok: true };
  });
  r.get('/api/me/reviews', (ctx) => {
    const c = ctxOf(ctx);
    return { items: reviewList(c).map((x) => M.reviewOf(c, x)) };
  });
  r.get('/api/me/overview', (ctx) => {
    const c = ctxOf(ctx);
    const saved = savedList(c), up = uploadedList(c), hist = historyList(c), rv = reviewList(c);
    return {
      counts: { saved: saved.length, uploaded: up.length, reviews: rv.length, history: hist.length },
      recentSaved: saved.slice(0, 4).map((x) => M.cardOf(c, x)),
      recentUploaded: up.slice(0, 4).map((x) => M.cardOf(c, x)),
      recentReviews: rv.slice(0, 2).map((x) => M.reviewOf(c, x))
    };
  });

  function setSaved(ctx, on) {
    const user = ctx.requireUser();
    const c = M.makeCtx(ctx.db, user);
    const rec = c.recipes.get(ctx.params.id);
    if (!rec) throw new HttpError(404, 'Không tìm thấy công thức');
    const db = ctx.db;
    const has = db.saved.some((s) => s.userId === user.id && s.recipeId === rec.id);
    if (on && !has) db.saved.push({ userId: user.id, recipeId: rec.id, at: new Date().toISOString() });
    if (!on && has) db.saved = db.saved.filter((s) => !(s.userId === user.id && s.recipeId === rec.id));
    if (on !== has) ctx.store.save();
    return { saved: on };
  }
  r.put('/api/recipes/:id/save', (ctx) => setSaved(ctx, true));
  r.delete('/api/recipes/:id/save', (ctx) => setSaved(ctx, false));
};
