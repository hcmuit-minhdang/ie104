'use strict';
const crypto = require('crypto');
const { HttpError } = require('../lib/http');
const M = require('../lib/model');

module.exports = function (app) {
  const r = app.router;

  r.get('/api/recipes/:id/reviews', (ctx) => {
    const c = M.makeCtx(ctx.db, ctx.user);
    const rec = c.recipes.get(ctx.params.id);
    if (!rec) throw new HttpError(404, 'Không tìm thấy công thức');
    const list = ctx.db.reviews.filter((x) => x.recipeId === rec.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const sum = list.reduce((s, x) => s + x.rating, 0);
    return { items: list.map((x) => M.reviewOf(c, x)), average: list.length ? Math.round((sum / list.length) * 10) / 10 : 0, count: list.length };
  });

  r.post('/api/recipes/:id/reviews', async (ctx) => {
    const user = ctx.requireUser();
    app.writeLimit(ctx);
    const b = await ctx.body();
    const c = M.makeCtx(ctx.db, user);
    const rec = c.recipes.get(ctx.params.id);
    if (!rec) throw new HttpError(404, 'Không tìm thấy công thức');
    const rating = Number(b.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Số sao phải từ 1 đến 5', 'rating');
    const text = typeof b.text === 'string' ? b.text.trim() : '';
    if (b.text !== undefined && typeof b.text !== 'string') throw new HttpError(400, 'Nội dung đánh giá không hợp lệ', 'text');
    if (text.length > 2000) throw new HttpError(400, 'Nội dung đánh giá quá dài (tối đa 2000 ký tự)', 'text');
    let rv = ctx.db.reviews.find((x) => x.recipeId === rec.id && x.userId === user.id);
    let created = !rv;
    if (rv) { rv.rating = rating; rv.text = text; rv.updatedAt = new Date().toISOString(); }
    else {
      rv = { id: 'rv_' + crypto.randomBytes(6).toString('hex'), recipeId: rec.id, userId: user.id, rating, text, createdAt: new Date().toISOString(), likedBy: [] };
      ctx.db.reviews.push(rv);
    }
    ctx.store.save();
    ctx.status = created ? 201 : 200;
    return { review: M.reviewOf(c, rv) };
  });

  r.post('/api/reviews/:id/like', (ctx) => {
    const user = ctx.requireUser();
    app.writeLimit(ctx);
    const rv = ctx.db.reviews.find((x) => x.id === ctx.params.id);
    if (!rv) throw new HttpError(404, 'Không tìm thấy đánh giá');
    rv.likedBy = rv.likedBy || [];
    const i = rv.likedBy.indexOf(user.id);
    if (i >= 0) rv.likedBy.splice(i, 1); else rv.likedBy.push(user.id);
    ctx.store.save();
    return { liked: i < 0, likes: rv.likedBy.length };
  });

  r.delete('/api/reviews/:id', (ctx) => {
    const user = ctx.requireUser();
    const i = ctx.db.reviews.findIndex((x) => x.id === ctx.params.id);
    if (i < 0) throw new HttpError(404, 'Không tìm thấy đánh giá');
    if (ctx.db.reviews[i].userId !== user.id) throw new HttpError(403, 'Bạn chỉ có thể xóa đánh giá của chính mình');
    ctx.db.reviews.splice(i, 1);
    ctx.store.save();
    return { ok: true };
  });
};
