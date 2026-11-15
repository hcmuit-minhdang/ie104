'use strict';
const { norm, hash32, formatVnd } = require('./text');
const { catalog, nameOf } = require('./catalog');

const INTERNAL = new Set(['authorId', 'main', 'seedRating', 'seedCount', 'legacyId', 'passwordHash']);

function publicUser(u) {
  return u ? { id: u.id, username: u.username, email: u.email, avatar: u.avatar || null, createdAt: u.createdAt } : null;
}

// Ngữ cảnh một request: các map tra cứu nhanh.
function makeCtx(db, user) {
  const stats = new Map();
  for (const r of db.reviews) {
    const s = stats.get(r.recipeId) || { sum: 0, count: 0 };
    s.sum += r.rating; s.count++; stats.set(r.recipeId, s);
  }
  const users = new Map(db.users.map((u) => [u.id, u]));
  const recipes = new Map();
  for (const r of db.recipes) { recipes.set(r.id, r); }
  for (const r of db.recipes) if (r.legacyId && !recipes.has(r.legacyId)) recipes.set(r.legacyId, r);
  let savedSet = null;
  if (user) savedSet = new Set(db.saved.filter((s) => s.userId === user.id).map((s) => s.recipeId));
  return { db, user, stats, users, recipes, savedSet };
}

function ratingOf(c, rec) {
  const s = c.stats.get(rec.id);
  if (s && s.count) return { rating: Math.round((s.sum / s.count) * 10) / 10, ratingCount: s.count };
  return { rating: rec.seedRating || 0, ratingCount: rec.seedCount || 0 };
}
function authorOf(c, rec) {
  const u = rec.authorId && c.users.get(rec.authorId);
  return u ? { id: u.id, username: u.username } : null;
}
function cardOf(c, rec) {
  const r = ratingOf(c, rec);
  const card = {
    id: rec.id, name: rec.name, image: rec.image, time: rec.time, price: rec.price, category: rec.category,
    rating: r.rating, ratingCount: r.ratingCount, author: authorOf(c, rec)
  };
  if (c.user) card.saved = c.savedSet.has(rec.id);
  return card;
}

const searchCache = new WeakMap();
function searchText(rec) {
  let s = searchCache.get(rec);
  if (!s) {
    const ing = (rec.ingredients || []).map((i) => i.name || nameOf(i.ingredientId)).join(' ');
    s = norm([rec.name, rec.category, rec.subcategory, (rec.tags || []).join(' '), ing].join(' | '));
    searchCache.set(rec, s);
  }
  return s;
}

function similarOf(c, rec) {
  const out = [];
  const seen = new Set([rec.id]);
  const push = (r) => { if (r && !seen.has(r.id) && out.length < 4) { seen.add(r.id); out.push(r); } };
  for (const id of rec.similar || []) push(c.recipes.get(typeof id === 'string' ? id : id && id.id));
  const same = c.db.recipes.filter((r) => r.category === rec.category && !seen.has(r.id));
  same.sort((a, b) => hash32(rec.id + a.id) - hash32(rec.id + b.id)).forEach(push);
  if (out.length < 4) c.db.recipes.filter((r) => !seen.has(r.id)).sort((a, b) => hash32(rec.id + a.id) - hash32(rec.id + b.id)).forEach(push);
  return out.map((r) => ({ id: r.id, name: r.name, price: formatVnd(r.price) + ' / phần', time: r.time + ' phút', image: r.image }));
}

function detailOf(c, rec) {
  const out = {};
  for (const k of Object.keys(rec)) if (!INTERNAL.has(k)) out[k] = rec[k];
  const r = ratingOf(c, rec);
  out.rating = r.rating; out.ratingCount = r.ratingCount;
  out.ratingScore = r.rating; out.reviewCount = r.ratingCount;
  out.author = authorOf(c, rec);
  out.similar = similarOf(c, rec);
  const top = c.db.reviews.filter((x) => x.recipeId === rec.id).sort((a, b) => (b.likedBy || []).length - (a.likedBy || []).length || (a.createdAt < b.createdAt ? 1 : -1))[0];
  const tu = top && c.users.get(top.userId);
  out.featuredReview = top ? { rating: top.rating, text: top.text, author: tu ? tu.username : '' } : { rating: 0, text: '', author: '' };
  if (c.user) out.saved = c.savedSet.has(rec.id);
  return out;
}

function reviewOf(c, rv) {
  const u = c.users.get(rv.userId);
  const rec = c.recipes.get(rv.recipeId);
  const out = {
    id: rv.id, recipeId: rv.recipeId, recipeName: rec ? rec.name : '',
    user: u ? { id: u.id, username: u.username, avatar: u.avatar || null } : { id: null, username: 'Người dùng đã xóa', avatar: null },
    rating: rv.rating, text: rv.text, createdAt: rv.createdAt, likes: (rv.likedBy || []).length
  };
  if (c.user) out.liked = (rv.likedBy || []).includes(c.user.id);
  return out;
}

function categoriesOf(db) {
  const m = new Map();
  for (const r of db.recipes) m.set(r.category, (m.get(r.category) || 0) + 1);
  const { slugify } = require('./text');
  return Array.from(m.entries()).map(([name, count]) => ({ id: slugify(name), name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
}

module.exports = { publicUser, makeCtx, ratingOf, cardOf, detailOf, reviewOf, searchText, categoriesOf, catalog };
