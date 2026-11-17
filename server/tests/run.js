'use strict';
// Test API tự động: node server/tests/run.js  (chỉ dùng node:test + fetch, server chạy trong cùng tiến trình)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../lib/app');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nomnom-test-'));
const PUBLIC = path.join(__dirname, '..', '..', 'public');

let inst, base;
function client() {
  let cookie = '';
  const c = {
    get cookie() { return cookie; },
    async req(method, url, body, headers) {
      const h = Object.assign({}, headers || {});
      if (cookie) h.Cookie = cookie;
      let payload;
      if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = typeof body === 'string' ? body : JSON.stringify(body); }
      const res = await fetch(base + url, { method, headers: h, body: payload, redirect: 'manual' });
      const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      for (const s of sc) { const kv = s.split(';')[0]; if (/Max-Age=0/i.test(s)) cookie = ''; else cookie = kv; }
      const text = await res.text();
      let json = null; try { json = JSON.parse(text); } catch (e) { /* not json */ }
      return { status: res.status, json, text, headers: res.headers, setCookie: sc };
    },
    get: (u) => c.req('GET', u), post: (u, b) => c.req('POST', u, b === undefined ? {} : b),
    put: (u, b) => c.req('PUT', u, b === undefined ? {} : b), patch: (u, b) => c.req('PATCH', u, b),
    del: (u, b) => c.req('DELETE', u, b)
  };
  return c;
}
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

test.before(async () => {
  inst = createApp({ port: 0, host: '127.0.0.1', dbFile: path.join(tmp, 'db.json'), uploadsDir: path.join(tmp, 'uploads'), rateLimit: 100000, writeLimit: 100000, contactLimit: 100000, quiet: true });
  const port = await inst.listen();
  base = 'http://127.0.0.1:' + port;
});
test.after(async () => { await inst.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('health, seed va tep tinh', async () => {
  const a = client();
  let r = await a.get('/api/health');
  assert.equal(r.status, 200); assert.equal(r.json.ok, true); assert.ok(r.json.recipes >= 100); assert.equal('users' in r.json, false);
  assert.equal(r.headers.get('x-frame-options'), 'DENY'); assert.equal(r.headers.get('x-content-type-options'), 'nosniff'); assert.equal(r.headers.get('referrer-policy'), 'same-origin');
  r = await a.get('/');
  assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/html/); assert.equal(r.headers.get('cache-control'), 'no-cache');
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'.*frame-ancestors 'none'/);
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  r = await a.get('/css/base.css');
  if (r.status === 200) assert.match(r.headers.get('content-type'), /text\/css/);
  for (const p of ['/server/API.md', '/server.js', '/server/data/db.json', '/.git/config', '/%2e%2e/server.js', '/..%2f..%2fserver.js', '/uploads/', '/uploads/../db.json', '/api/nope']) {
    r = await a.get(p);
    assert.equal(r.status, 404, p);
  }
  r = await a.get('/api/nope'); assert.ok(r.json && r.json.error);
  r = await a.req('POST', '/api/health', {}); assert.equal(r.status, 405);
});

test('JSON hong -> 400, qua lon -> 413', async () => {
  const a = client();
  let r = await a.req('POST', '/api/auth/login', '{bad json');
  assert.equal(r.status, 400); assert.ok(r.json.error);
  r = await a.req('POST', '/api/auth/login', '[1,2]'); assert.equal(r.status, 400);
  r = await a.req('POST', '/api/auth/login', { identifier: 'x'.repeat(400000), password: 'y' }); assert.equal(r.status, 413);
  r = await a.get('/api/recipes/%E0%A4%A'); assert.ok([400, 404].includes(r.status));
});

test('auth: dang ky, dang nhap, cookie, dang xuat', async () => {
  const a = client();
  let r = await a.get('/api/me'); assert.equal(r.status, 200); assert.equal(r.json.user, null);
  r = await a.post('/api/auth/register', { username: 'ab', email: 'a@b.vn', password: '123456' }); assert.equal(r.status, 400); assert.equal(r.json.field, 'username');
  r = await a.post('/api/auth/register', { username: 'tester1', email: 'bad', password: '123456' }); assert.equal(r.json.field, 'email');
  r = await a.post('/api/auth/register', { username: 'tester1', email: 't1@x.vn', password: '123' }); assert.equal(r.json.field, 'password');
  r = await a.post('/api/auth/register', { username: 'tester1', email: 'T1@x.vn', password: 'secret1' });
  assert.equal(r.status, 201); assert.equal(r.json.user.username, 'tester1'); assert.equal(r.json.user.email, 't1@x.vn');
  assert.equal(r.json.user.passwordHash, undefined);
  const sc = r.setCookie[0];
  assert.match(sc, /^nomnom_sid=[0-9a-f]{64}/); assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Lax/); assert.match(sc, /Max-Age=2592000/);
  r = await a.get('/api/me'); assert.equal(r.json.user.username, 'tester1');
  const b = client();
  r = await b.post('/api/auth/register', { username: 'TESTER1', email: 'other@x.vn', password: 'secret1' }); assert.equal(r.status, 409); assert.equal(r.json.field, 'username');
  r = await b.post('/api/auth/register', { username: 'tester2', email: 't1@X.vn', password: 'secret1' }); assert.equal(r.status, 409); assert.equal(r.json.field, 'email');
  r = await b.post('/api/auth/login', { identifier: 'tester1', password: 'wrong' }); assert.equal(r.status, 401);
  r = await b.post('/api/auth/login', { identifier: 'nobody', password: 'wrong' }); assert.equal(r.status, 401);
  r = await b.post('/api/auth/login', { identifier: 'tester1' }); assert.equal(r.status, 400);
  r = await b.post('/api/auth/login', { identifier: 'T1@x.vn', password: 'secret1' }); assert.equal(r.status, 200);
  r = await b.get('/api/me'); assert.equal(r.json.user.username, 'tester1');
  r = await b.post('/api/auth/logout'); assert.equal(r.json.ok, true);
  r = await b.get('/api/me'); assert.equal(r.json.user, null);
  // cookie gia
  const f = client(); r = await f.req('GET', '/api/me', undefined, { Cookie: 'nomnom_sid=' + 'a'.repeat(64) }); assert.equal(r.json.user, null);
  // cross-origin bi chan
  r = await a.req('POST', '/api/auth/logout', {}, { Origin: 'http://evil.example' }); assert.equal(r.status, 403);
});

test('401 voi cac endpoint can dang nhap', async () => {
  const a = client();
  const calls = [['GET', '/api/me/saved'], ['GET', '/api/me/uploaded'], ['GET', '/api/me/history'], ['DELETE', '/api/me/history'], ['GET', '/api/me/reviews'],
    ['GET', '/api/me/overview'], ['PUT', '/api/recipes/bo-kho/save'], ['DELETE', '/api/recipes/bo-kho/save'], ['POST', '/api/recipes', {}],
    ['DELETE', '/api/recipes/bo-kho'], ['POST', '/api/uploads', {}], ['POST', '/api/recipes/bo-kho/reviews', { rating: 5 }],
    ['POST', '/api/reviews/x/like', {}], ['DELETE', '/api/reviews/x'], ['PATCH', '/api/me', {}], ['DELETE', '/api/me', {}]];
  for (const [m, u, b] of calls) { const r = await a.req(m, u, b); assert.equal(r.status, 401, m + ' ' + u); assert.ok(r.json.error); }
});

test('recipes: loc theo 7 nhom (OR trong nhom, AND giua cac nhom)', async () => {
  const a = client();
  const total = (qs) => a.get('/api/recipes?limit=1&' + qs).then((r) => r.json.total);
  const bo = await total('dam=' + encodeURIComponent('Thịt bò'));
  const ga = await total('dam=' + encodeURIComponent('Thịt gà'));
  assert.ok(bo > 0 && ga > 0);
  // Trong cung mot nhom: chi can khop mot nhan (bo HOAC ga)
  assert.equal(await total('dam=' + encodeURIComponent('Thịt bò,Thịt gà')), bo + ga);
  // Giua cac nhom: phai khop tat ca
  const boNam = await total('dam=' + encodeURIComponent('Thịt bò') + '&vung-mien=' + encodeURIComponent('Miền Nam'));
  assert.ok(boNam > 0 && boNam < bo);
  assert.equal(await total('dam=' + encodeURIComponent('Thịt bò') + '&che-do-an=' + encodeURIComponent('Ăn chay')), 0);
  // Ket qua tra ve dung nhan da chon va khong lam hong cac tham so cu
  const r = await a.get('/api/recipes?limit=50&dam=' + encodeURIComponent('Thịt bò') + '&maxTime=60');
  assert.equal(r.status, 200); assert.ok(r.json.items.every((x) => x.time <= 60));
});

test('recipes: danh sach, loc, sap xep, phan trang, tim khong dau', async () => {
  const a = client();
  let r = await a.get('/api/recipes');
  assert.equal(r.status, 200); assert.equal(r.json.items.length, 12); assert.equal(r.json.page, 1); assert.ok(r.json.total > 100); assert.equal(r.json.pages, Math.ceil(r.json.total / 12));
  const c = r.json.items[0];
  for (const k of ['id', 'name', 'image', 'time', 'price', 'category', 'rating', 'ratingCount', 'author']) assert.ok(k in c, k);
  assert.equal(typeof c.time, 'number'); assert.equal(typeof c.price, 'number'); assert.equal('saved' in c, false);
  r = await a.get('/api/recipes?limit=500'); assert.equal(r.json.items.length, 50);
  r = await a.get('/api/recipes?limit=5&page=2'); assert.equal(r.json.items.length, 5); assert.equal(r.json.page, 2);
  const p1 = (await a.get('/api/recipes?limit=5&page=1')).json.items.map((x) => x.id);
  assert.ok(!r.json.items.some((x) => p1.includes(x.id)));
  r = await a.get('/api/recipes?page=9999'); assert.equal(r.json.items.length, 0);
  r = await a.get('/api/recipes?page=abc'); assert.equal(r.status, 400);
  r = await a.get('/api/recipes?sort=bogus'); assert.equal(r.status, 400);
  r = await a.get('/api/recipes?maxTime=abc'); assert.equal(r.status, 400);
  const withAcc = (await a.get('/api/recipes?q=' + encodeURIComponent('Bò kho') + '&limit=50')).json;
  const noAcc = (await a.get('/api/recipes?q=bo%20kho&limit=50')).json;
  assert.ok(withAcc.total > 0); assert.deepEqual(noAcc.items.map((x) => x.id), withAcc.items.map((x) => x.id));
  assert.equal(withAcc.items[0].id, 'bo-kho');
  const dd = (await a.get('/api/recipes?q=' + encodeURIComponent('đậu hũ'))).json; const dd2 = (await a.get('/api/recipes?q=dau%20hu')).json;
  assert.ok(dd.total > 0); assert.equal(dd.total, dd2.total);
  assert.equal((await a.get('/api/recipes?q=' + encodeURIComponent('ĐẬU HŨ'))).json.total, dd.total);
  // theo nguyen lieu
  assert.ok((await a.get('/api/recipes?q=hoa%20hoi')).json.items.some((x) => x.id === 'bo-kho'));
  assert.equal((await a.get('/api/recipes?q=zzzzqqq')).json.total, 0);
  // loc
  r = await a.get('/api/recipes?maxTime=20&limit=50'); assert.ok(r.json.items.length > 0 && r.json.items.every((x) => x.time <= 20));
  r = await a.get('/api/recipes?maxPrice=30000&limit=50'); assert.ok(r.json.items.length > 0 && r.json.items.every((x) => x.price <= 30000));
  r = await a.get('/api/recipes?sort=time&limit=50'); const t = r.json.items.map((x) => x.time); assert.deepEqual(t, t.slice().sort((x, y) => x - y));
  r = await a.get('/api/recipes?sort=price&limit=50'); const pr = r.json.items.map((x) => x.price); assert.deepEqual(pr, pr.slice().sort((x, y) => x - y));
  r = await a.get('/api/recipes?sort=rating&limit=50'); const rt = r.json.items.map((x) => x.rating); assert.deepEqual(rt, rt.slice().sort((x, y) => y - x));
  r = await a.get('/api/recipes?sort=new&limit=3'); assert.equal(r.json.items.length, 3);
  // danh muc
  const cats = (await a.get('/api/categories')).json.items;
  assert.ok(cats.length >= 5); for (const k of ['id', 'name', 'count']) assert.ok(k in cats[0]);
  assert.equal(cats.reduce((s, x) => s + x.count, 0), (await a.get('/api/health')).json.recipes);
  const byId = (await a.get('/api/recipes?category=' + cats[0].id + '&limit=50')).json;
  const byName = (await a.get('/api/recipes?category=' + encodeURIComponent(cats[0].name) + '&limit=50')).json;
  assert.equal(byId.total, cats[0].count); assert.equal(byName.total, cats[0].count);
  assert.ok(byId.items.every((x) => x.category === cats[0].name));
});

test('recipes: chi tiet day du hinh dang Recipe', async () => {
  const a = client();
  let r = await a.get('/api/recipes/khong-ton-tai'); assert.equal(r.status, 404);
  r = await a.get('/api/recipes/bo-kho'); assert.equal(r.status, 200);
  const d = r.json;
  assert.equal(d.id, 'bo-kho'); assert.equal(d.title, 'Bò kho'); assert.ok(d.ingredients.length >= 10 && d.ingredients[0].ingredientId);
  assert.ok(Array.isArray(d.steps) && Array.isArray(d.steps[0].text) && Array.isArray(d.steps[0].images));
  assert.ok(d.gallery[0].startsWith('/assets/images/recipes/bo-kho/'));
  assert.ok(d.quickSteps.length && d.nutrition.calories && typeof d.prepTime === 'number' && d.baseServings && d.costTotal);
  assert.equal(d.similar.length, 4); assert.ok(d.similar[0].id && d.similar[0].price && d.similar[0].time && d.similar[0].image);
  assert.equal(typeof d.rating, 'number'); assert.equal(typeof d.ratingCount, 'number'); assert.equal(d.author, null);
  assert.equal(d.passwordHash, undefined); assert.equal(d.authorId, undefined);
  // the Phat: van la Recipe day du
  const list = (await a.get('/api/recipes?limit=50&page=3')).json.items;
  const ext = list.find((x) => x.image.startsWith('http') || x.image.includes('/community/'));
  assert.ok(ext);
  const e = (await a.get('/api/recipes/' + ext.id)).json;
  for (const k of ['title', 'description', 'gallery', 'ingredients', 'quickSteps', 'steps', 'nutrition', 'similar', 'prepTime', 'cookTime', 'baseServings', 'costTotal', 'rating', 'ratingCount', 'createdAt']) assert.ok(k in e, k);
  assert.ok(e.ingredients.length >= 4 && e.steps.length >= 4); assert.ok(e.steps.every((s) => s.text.length && s.images.length));
  const e2 = (await a.get('/api/recipes/' + ext.id)).json; assert.deepEqual(e2.ingredients, e.ingredients);
  // id cu rec-001
  assert.equal((await a.get('/api/recipes/rec-001')).status, 200);
});

test('anh cuc bo trong seed deu ton tai trong public/', async () => {
  const a = client();
  const ids = []; let page = 1;
  for (;;) { const r = await a.get('/api/recipes?limit=50&page=' + page); ids.push(...r.json.items); if (page >= r.json.pages) break; page++; }
  const missing = [];
  const check = (u) => { if (typeof u === 'string' && u.startsWith('/') && !u.startsWith('/uploads/') && !fs.existsSync(path.join(PUBLIC, decodeURIComponent(u)))) missing.push(u); };
  for (const c of ids) {
    check(c.image);
    if (c.image.startsWith('/')) {
      const d = (await a.get('/api/recipes/' + c.id)).json;
      (d.gallery || []).forEach((g) => check(typeof g === 'string' ? g : g.src));
      (d.steps || []).forEach((s) => (s.images || []).forEach((g) => check(typeof g === 'string' ? g : g.src)));
      (d.similar || []).forEach((s) => check(s.image));
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test('save / unsave / history / overview', async () => {
  const a = client();
  await a.post('/api/auth/register', { username: 'saver', email: 'saver@x.vn', password: 'secret1' });
  assert.equal((await a.put('/api/recipes/khong-co/save')).status, 404);
  let r = await a.put('/api/recipes/bo-kho/save'); assert.deepEqual(r.json, { saved: true });
  r = await a.put('/api/recipes/bo-kho/save'); assert.deepEqual(r.json, { saved: true });
  await a.put('/api/recipes/ga-kho-sa/save');
  r = await a.get('/api/me/saved'); assert.equal(r.json.total, 2); assert.equal(r.json.items[0].id, 'ga-kho-sa'); assert.equal(r.json.items[0].saved, true);
  r = await a.get('/api/me/saved?limit=1&page=2'); assert.equal(r.json.items.length, 1); assert.equal(r.json.pages, 2);
  assert.equal((await a.get('/api/recipes/bo-kho')).json.saved, true);
  assert.equal((await a.get('/api/recipes?q=bo%20kho')).json.items.find((x) => x.id === 'bo-kho').saved, true);
  r = await a.del('/api/recipes/bo-kho/save'); assert.deepEqual(r.json, { saved: false });
  assert.equal((await a.get('/api/me/saved')).json.total, 1);
  // lich su: dedupe, dua len dau
  await a.get('/api/recipes/bo-kho'); await a.get('/api/recipes/com-chien-trung'); await a.get('/api/recipes/bo-kho');
  r = await a.get('/api/me/history');
  assert.deepEqual(r.json.items.map((x) => x.id).slice(0, 2), ['bo-kho', 'com-chien-trung']); assert.equal(r.json.total, 2); assert.ok(r.json.items[0].viewedAt);
  r = await a.get('/api/me/overview');
  assert.deepEqual(r.json.counts, { saved: 1, uploaded: 0, reviews: 0, history: 2 });
  assert.ok(r.json.recentSaved.length <= 4 && Array.isArray(r.json.recentUploaded) && Array.isArray(r.json.recentReviews));
  r = await a.del('/api/me/history'); assert.equal(r.json.ok, true);
  assert.equal((await a.get('/api/me/history')).json.total, 0);
  // khach khong ghi lich su
  const g = client(); await g.get('/api/recipes/bo-kho');
});

test('reviews: tao, cap nhat, like, xoa, quyen so huu, rating the', async () => {
  const a = client(), b = client();
  await a.post('/api/auth/register', { username: 'rev_a', email: 'reva@x.vn', password: 'secret1' });
  await b.post('/api/auth/register', { username: 'rev_b', email: 'revb@x.vn', password: 'secret1' });
  const rid = 'goi-xoai-xanh';
  let r = await a.get('/api/recipes/' + rid + '/reviews');
  const before = r.json.count;
  assert.equal((await a.get('/api/recipes/khong-co/reviews')).status, 404);
  assert.equal((await a.post('/api/recipes/khong-co/reviews', { rating: 5, text: 'x' })).status, 404);
  for (const bad of [0, 6, 'abc', 2.5, null]) assert.equal((await a.post('/api/recipes/' + rid + '/reviews', { rating: bad, text: 'x' })).status, 400);
  assert.equal((await a.post('/api/recipes/' + rid + '/reviews', { rating: 5, text: 'x'.repeat(2001) })).status, 400);
  r = await a.post('/api/recipes/' + rid + '/reviews', { rating: 3, text: 'Tạm được' });
  assert.equal(r.status, 201); const rv = r.json.review;
  assert.equal(rv.rating, 3); assert.equal(rv.recipeId, rid); assert.ok(rv.recipeName); assert.equal(rv.user.username, 'rev_a'); assert.equal(rv.likes, 0);
  r = await a.post('/api/recipes/' + rid + '/reviews', { rating: 5, text: 'Ngon hơn nghĩ' });
  assert.equal(r.status, 200); assert.equal(r.json.review.id, rv.id); assert.equal(r.json.review.rating, 5);
  r = await a.get('/api/recipes/' + rid + '/reviews'); assert.equal(r.json.count, before + 1);
  assert.ok(r.json.items.some((x) => x.id === rv.id && x.text === 'Ngon hơn nghĩ'));
  // like
  assert.equal((await b.post('/api/reviews/khong-co/like')).status, 404);
  r = await b.post('/api/reviews/' + rv.id + '/like'); assert.deepEqual(r.json, { liked: true, likes: 1 });
  r = await b.get('/api/recipes/' + rid + '/reviews'); assert.equal(r.json.items.find((x) => x.id === rv.id).liked, true);
  r = await b.post('/api/reviews/' + rv.id + '/like'); assert.deepEqual(r.json, { liked: false, likes: 0 });
  // quyen
  assert.equal((await b.del('/api/reviews/' + rv.id)).status, 403);
  assert.equal((await b.del('/api/reviews/khong-co')).status, 404);
  r = await a.get('/api/me/reviews'); assert.equal(r.json.items.length, 1);
  assert.equal((await a.get('/api/me/overview')).json.counts.reviews, 1);
  // rating the tinh tu danh gia: moi cong thuc moi
  const up = await a.post('/api/recipes', { name: 'Món thử đánh giá', time: 10, ingredients: [{ name: 'Trứng', quantity: 1, unit: 'quả' }], steps: [{ text: 'Chiên' }] });
  const nid = up.json.id;
  await a.post('/api/recipes/' + nid + '/reviews', { rating: 4, text: '' });
  await b.post('/api/recipes/' + nid + '/reviews', { rating: 5, text: 'ok' });
  r = await a.get('/api/recipes/' + nid); assert.equal(r.json.rating, 4.5); assert.equal(r.json.ratingCount, 2);
  r = await a.get('/api/recipes/' + nid + '/reviews'); assert.equal(r.json.average, 4.5); assert.equal(r.json.count, 2);
  r = await a.del('/api/reviews/' + rv.id); assert.equal(r.json.ok, true);
  assert.equal((await a.get('/api/me/reviews')).json.items.length, 1);
});

test('upload anh + dang cong thuc + xoa (cascade, quyen so huu)', async () => {
  const a = client(), b = client();
  await a.post('/api/auth/register', { username: 'cook_a', email: 'cooka@x.vn', password: 'secret1' });
  await b.post('/api/auth/register', { username: 'cook_b', email: 'cookb@x.vn', password: 'secret1' });
  // upload
  assert.equal((await a.post('/api/uploads', { dataUrl: 'data:text/html;base64,PGI+' })).status, 400);
  assert.equal((await a.post('/api/uploads', { dataUrl: 'data:image/png;base64,AAAA' })).status, 400); // sai magic
  assert.equal((await a.post('/api/uploads', {})).status, 400);
  assert.equal((await a.post('/api/uploads', { dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' })).status, 400);
  const big = 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0]), Buffer.alloc(3.2 * 1024 * 1024)]).toString('base64');
  assert.equal((await a.post('/api/uploads', { dataUrl: big })).status, 413);
  let r = await a.post('/api/uploads', { dataUrl: PNG });
  assert.equal(r.status, 200); assert.match(r.json.url, /^\/uploads\/[0-9a-f]+\.png$/);
  const url = r.json.url;
  const img = await fetch(base + url); assert.equal(img.status, 200); assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal((await fetch(base + '/uploads/..%2fdb.json')).status, 404);
  assert.equal((await fetch(base + '/uploads/nope.png')).status, 404);
  // tao cong thuc
  assert.equal((await a.post('/api/recipes', { name: 'ab' })).status, 400);
  assert.equal((await a.post('/api/recipes', { name: 'Món ngon', ingredients: [], steps: [{ text: 'x' }] })).status, 400);
  assert.equal((await a.post('/api/recipes', { name: 'Món ngon', ingredients: [{ name: 'Trứng' }], steps: [] })).status, 400);
  assert.equal((await a.post('/api/recipes', { name: 'Món ngon', time: -5, ingredients: [{ name: 'Trứng' }], steps: [{ text: 'x' }] })).status, 400);
  assert.equal((await a.post('/api/recipes', { name: 'Món ngon', image: 'javascript:alert(1)', ingredients: [{ name: 'Trứng' }], steps: [{ text: 'x' }] })).status, 400);
  r = await a.post('/api/recipes', {
    name: 'Bánh xèo nhà làm', description: 'Giòn rụm', image: url, time: 40, servings: 3, category: 'Món Á', extraField: 'bỏ', authorId: 'u_demo', rating: 5, id: 'hack', main: ['x'], nutrition: { calories: '300 kcal', evil: 'x', protein: 12 },
    ingredients: [{ name: 'Thịt heo', quantity: 200, unit: 'g' }, { name: 'Bột gạo', quantity: 1, unit: 'chén' }],
    steps: [{ text: 'Trộn bột', image: url }, { text: 'Chiên vàng' }]
  });
  assert.equal(r.status, 201); const id = r.json.id; assert.match(id, /^banh-xeo-nha-lam-/);
  r = await a.get('/api/recipes/' + id);
  assert.equal(r.json.title, 'Bánh xèo nhà làm'); assert.equal(r.json.extraField, undefined); assert.equal(r.json.nutrition.evil, undefined); assert.equal(r.json.nutrition.calories, '300 kcal'); assert.equal(r.json.nutrition.protein, 12); assert.notEqual(r.json.id, 'hack'); assert.equal(r.json.author.username, 'cook_a'); assert.equal(r.json.ratingCount, 0);
  assert.equal(r.json.ingredients[0].ingredientId, 'thit-heo'); assert.equal(r.json.ingredients[1].name, 'Bột gạo'); assert.equal(r.json.baseServings, 3);
  assert.deepEqual(r.json.steps[0].images, [url]); assert.deepEqual(r.json.steps[0].text, ['Trộn bột']);
  r = await a.get('/api/recipes?q=banh%20xeo'); assert.ok(r.json.items.some((x) => x.id === id && x.author.username === 'cook_a'));
  r = await a.get('/api/me/uploaded'); assert.equal(r.json.total, 1);
  assert.equal((await a.get('/api/me/overview')).json.counts.uploaded, 1);
  // giu prepTime/cookTime/quickSteps do client gui, khong trung anh buoc
  const r2 = await a.post('/api/recipes', { name: 'Món giữ thời gian', time: 50, prepTime: 7, cookTime: 43, quickSteps: ['Bước một', 'Bước hai'], image: url, ingredients: [{ name: 'Muối' }], steps: [{ text: 'a', image: url, images: [url] }] });
  const d2 = (await a.get('/api/recipes/' + r2.json.id)).json;
  assert.equal(d2.prepTime, 7); assert.equal(d2.cookTime, 43); assert.deepEqual(d2.quickSteps, ['Bước một', 'Bước hai']); assert.deepEqual(d2.steps[0].images, [url]);
  const r3 = await a.post('/api/recipes', { name: 'Món tự tính', time: 50, ingredients: [{ name: 'Muối' }], steps: [{ text: 'a b' }] });
  const d3 = (await a.get('/api/recipes/' + r3.json.id)).json; assert.equal(d3.prepTime + d3.cookTime, 50); assert.deepEqual(d3.quickSteps, ['a b']);
  assert.equal((await a.post('/api/recipes', { name: 'Món sai', prepTime: 'x', ingredients: [{ name: 'Muối' }], steps: [{ text: 'a' }] })).status, 400);
  await a.del('/api/recipes/' + r2.json.id); await a.del('/api/recipes/' + r3.json.id);
  // ingredient catalog co nguyen lieu tu chon
  const ing = (await a.get('/api/ingredients')).json; assert.equal(ing.items.length, require('../lib/catalog').catalog.items.length); assert.equal(ing.units['chén'], undefined);
  // b luu, danh gia, xem
  await b.put('/api/recipes/' + id + '/save'); await b.post('/api/recipes/' + id + '/reviews', { rating: 5, text: 'ngon' }); await b.get('/api/recipes/' + id);
  assert.equal((await b.get('/api/me/saved')).json.total, 1);
  // quyen xoa
  assert.equal((await b.del('/api/recipes/' + id)).status, 403);
  assert.equal((await a.del('/api/recipes/bo-kho')).status, 403);
  assert.equal((await a.del('/api/recipes/khong-co')).status, 404);
  assert.equal((await a.del('/api/recipes/' + id)).json.ok, true);
  assert.equal((await a.get('/api/recipes/' + id)).status, 404);
  assert.equal((await b.get('/api/me/saved')).json.total, 0);
  assert.equal((await b.get('/api/me/reviews')).json.items.length, 0);
  assert.equal((await b.get('/api/me/history')).json.total, 0);
  assert.equal((await fetch(base + url)).status, 404); // anh mo coi bi xoa
});

test('PATCH /api/me va DELETE /api/me', async () => {
  const a = client(), other = client();
  await other.post('/api/auth/register', { username: 'taken_u', email: 'taken@x.vn', password: 'secret1' });
  await a.post('/api/auth/register', { username: 'edit_u', email: 'edit@x.vn', password: 'secret1' });
  assert.equal((await a.patch('/api/me', { username: 'newname' })).status, 400);
  assert.equal((await a.patch('/api/me', { username: 'newname', currentPassword: 'wrongpw' })).status, 403);
  assert.equal((await a.patch('/api/me', { username: 'taken_U', currentPassword: 'secret1' })).status, 409);
  assert.equal((await a.patch('/api/me', { email: 'taken@x.vn', currentPassword: 'secret1' })).status, 409);
  assert.equal((await a.patch('/api/me', { email: 'nope', currentPassword: 'secret1' })).status, 400);
  assert.equal((await a.patch('/api/me', { newPassword: '123', currentPassword: 'secret1' })).status, 400);
  let r = await a.patch('/api/me', { username: 'edit_u2', email: 'edit2@x.vn', newPassword: 'newsecret', currentPassword: 'secret1' });
  assert.equal(r.status, 200); assert.equal(r.json.user.username, 'edit_u2');
  assert.equal((await a.get('/api/me')).json.user.email, 'edit2@x.vn');
  const c = client();
  assert.equal((await c.post('/api/auth/login', { identifier: 'edit_u2', password: 'secret1' })).status, 401);
  assert.equal((await c.post('/api/auth/login', { identifier: 'edit2@x.vn', password: 'newsecret' })).status, 200);
  // tao du lieu roi xoa tai khoan
  const rid = (await a.post('/api/recipes', { name: 'Món sẽ mồ côi', ingredients: [{ name: 'Muối' }], steps: [{ text: 'x' }] })).json.id;
  await a.put('/api/recipes/bo-kho/save'); await a.post('/api/recipes/bo-kho/reviews', { rating: 1, text: 'tệ' });
  const cntBefore = (await a.get('/api/recipes/bo-kho/reviews')).json.count;
  assert.equal((await a.del('/api/me', {})).status, 400);
  assert.equal((await a.del('/api/me', { password: 'secret1' })).status, 403);
  r = await a.del('/api/me', { password: 'newsecret' }); assert.equal(r.json.ok, true);
  assert.equal((await a.get('/api/me')).json.user, null);
  assert.equal((await c.get('/api/me')).json.user, null); // session cua c cung bi xoa
  assert.equal((await c.post('/api/auth/login', { identifier: 'edit_u2', password: 'newsecret' })).status, 401);
  assert.equal((await a.get('/api/recipes/bo-kho/reviews')).json.count, cntBefore - 1);
  const orphan = (await a.get('/api/recipes/' + rid)); assert.equal(orphan.status, 200); assert.equal(orphan.json.author, null);
  // dang ky lai ten cu
  assert.equal((await client().post('/api/auth/register', { username: 'edit_u2', email: 'edit2@x.vn', password: 'secret1' })).status, 201);
});

test('ingredients, compare, fridge, contact', async () => {
  const a = client();
  let r = await a.get('/api/ingredients');
  assert.ok(r.json.items.length >= 50 && r.json.items[0].id && r.json.units.g && r.json.units['muỗng canh']);
  r = await a.get('/api/ingredients/compare'); assert.equal(r.status, 400);
  r = await a.get('/api/ingredients/compare?names=' + encodeURIComponent('thịt heo,Trứng,xyzabc'));
  assert.equal(r.json.items.length, 3);
  const h = r.json.items[0]; assert.equal(h.name, 'Thịt heo'); assert.ok(h.stores.length >= 5); assert.equal(h.price, Math.min(...h.stores.map((s) => s.price)));
  assert.ok(h.stores.every((s) => s.store && s.price > 0)); assert.equal(r.json.items[2].price, null); assert.deepEqual(r.json.items[2].stores, []);
  assert.deepEqual((await a.get('/api/ingredients/compare?names=' + encodeURIComponent('thit heo'))).json.items[0].stores, h.stores);
  // fridge
  r = await a.get('/api/fridge?ingredients=thit-bo,banh-mi&limit=5');
  assert.equal(r.status, 200); assert.ok(r.json.items.length >= 1 && r.json.items.length <= 5);
  for (const it of r.json.items) { assert.ok(it.recipe.id && Array.isArray(it.matched) && Array.isArray(it.missing)); assert.ok(it.score > 0 && it.score <= 1); assert.equal(it.status, it.missing.length ? 'thieu' : 'du'); assert.equal(it.score, Math.round(it.matched.length / (it.matched.length + it.missing.length) * 100) / 100); }
  const sc = r.json.items.map((x) => x.score); assert.deepEqual(sc, sc.slice().sort((x, y) => y - x));
  assert.equal(r.json.items[0].status, 'du');
  r = await a.get('/api/fridge?ingredients=' + encodeURIComponent('dam:thit-bo,tinh-bot:banh-mi')); assert.ok(r.json.items.length > 0);
  r = await a.get('/api/fridge?ingredients=' + encodeURIComponent('Thịt bò')); assert.ok(r.json.items.length > 0 && r.json.items[0].matched.includes('Thịt bò'));
  r = await a.get('/api/fridge?ingredients=zzz-khong-co'); assert.equal(r.json.items.length, 0);
  r = await a.get('/api/fridge'); assert.ok(r.json.items.length > 0);
  // contact
  assert.equal((await a.post('/api/contact', { name: '', email: 'a@b.vn', message: 'xin chào bạn' })).status, 400);
  assert.equal((await a.post('/api/contact', { name: 'An', email: 'bad', message: 'xin chào bạn' })).status, 400);
  assert.equal((await a.post('/api/contact', { name: 'An', email: 'a@b.vn', message: 'hi' })).status, 400);
  r = await a.post('/api/contact', { name: 'An', email: 'a@b.vn', message: 'Xin chào NomNom!' }); assert.equal(r.status, 201); assert.equal(r.json.ok, true);
  assert.equal(inst.store.data.contacts.length, 1);
});

test('demo account + seed idempotent + DB duoc ghi ra dia', async () => {
  const a = client();
  let r = await a.post('/api/auth/login', { identifier: 'demo@nomnom.vn', password: 'demo123' }); assert.equal(r.status, 200);
  r = await a.get('/api/me/overview'); assert.ok(r.json.counts.saved >= 3); assert.equal(r.json.counts.uploaded, 2); assert.equal(r.json.counts.reviews, 4); assert.ok(r.json.counts.history >= 1);
  assert.equal(r.json.recentReviews.length, 2);
  const file = JSON.parse(fs.readFileSync(path.join(tmp, 'db.json'), 'utf8'));
  assert.ok(file.users.some((u) => u.username === 'demo' && u.passwordHash.startsWith('s1$')));
  assert.ok(!JSON.stringify(file).includes('demo123'));
  assert.ok(file.sessions.every((s) => s.id.length === 64 && !s.sid));
  assert.ok(!fs.readdirSync(tmp).some((f) => f.endsWith('.tmp')));
  // khoi dong lai tren cung file -> khong seed lai, giu du lieu
  inst.store.flush(); const n = file.recipes.length; const users = file.users.length;
  const second = createApp({ port: 0, host: '127.0.0.1', dbFile: path.join(tmp, 'db.json'), uploadsDir: path.join(tmp, 'uploads'), quiet: true });
  assert.equal(second.store.data.recipes.length, n); assert.equal(second.store.data.users.length, users);
  const demoRec = second.store.data.recipes.filter((x) => x.authorId === 'u_demo'); assert.equal(demoRec.length, 2);
});

test('gioi han tan suat dang nhap/dang ky (429)', async () => {
  const limited = createApp({ port: 0, host: '127.0.0.1', dbFile: path.join(tmp, 'rl.json'), uploadsDir: path.join(tmp, 'uploads'), rateLimit: 3, quiet: true });
  const port = await limited.listen();
  const post = () => fetch('http://127.0.0.1:' + port + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: 'x', password: 'y' }) });
  const codes = []; for (let i = 0; i < 5; i++) { const r = await post(); codes.push(r.status); if (r.status === 429) assert.ok(r.headers.get('retry-after')); }
  assert.deepEqual(codes, [401, 401, 401, 429, 429]);
  const other = await fetch('http://127.0.0.1:' + port + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: 'khac', password: 'y' }) });
  assert.equal(other.status, 401); // dinh danh khac khong bi khoa
  await limited.close();
});

test('gioi han ghi (uploads/recipes/reviews/contact) va quota upload', async () => {
  const lim = createApp({ port: 0, host: '127.0.0.1', dbFile: path.join(tmp, 'wl.json'), uploadsDir: path.join(tmp, 'uploads-wl'), rateLimit: 1000, writeLimit: 3, contactLimit: 2, uploadQuota: 2, quiet: true });
  const port = await lim.listen(); const old = base; base = 'http://127.0.0.1:' + port;
  try {
    const a = client();
    await a.post('/api/auth/register', { username: 'wl_user', email: 'wl@x.vn', password: 'secret1' });
    assert.equal((await a.post('/api/uploads', { dataUrl: PNG })).status, 200);
    assert.equal((await a.post('/api/uploads', { dataUrl: PNG })).status, 200);
    assert.equal((await a.post('/api/uploads', { dataUrl: PNG })).status, 429); // quota 2
    const c = client();
    assert.equal((await c.post('/api/contact', { name: 'A', email: 'a@b.vn', message: 'xin chao ban' })).status, 201);
    assert.equal((await c.post('/api/contact', { name: 'A', email: 'a@b.vn', message: 'xin chao ban' })).status, 201);
    const r = await c.post('/api/contact', { name: 'A', email: 'a@b.vn', message: 'xin chao ban' });
    assert.equal(r.status, 429); assert.ok(r.headers.get('retry-after'));
    const b = client();
    await b.post('/api/auth/register', { username: 'wl_two', email: 'wl2@x.vn', password: 'secret1' });
    const codes = []; for (let i = 0; i < 5; i++) codes.push((await b.post('/api/recipes/bo-kho/reviews', { rating: 5, text: 'x' })).status);
    assert.deepEqual(codes, [201, 200, 200, 429, 429]);
  } finally { base = old; await lim.close(); }
});

test('category slug -> ten co san; xoa cong thuc khong go anh con duoc dung; GC upload mo coi', async () => {
  const a = client();
  await a.post('/api/auth/register', { username: 'gc_user', email: 'gc@x.vn', password: 'secret1' });
  const cats = (await a.get('/api/categories')).json.items;
  const mk = async (extra) => (await a.post('/api/recipes', Object.assign({ name: 'Mon thu nghiem', ingredients: [{ name: 'Muối' }], steps: [{ text: 'x' }] }, extra)));
  let r = await mk({ category: cats[0].id }); const id1 = r.json.id;
  assert.equal((await a.get('/api/recipes/' + id1)).json.category, cats[0].name);
  r = await mk({ category: '  Danh mục lạ  ' }); assert.equal((await a.get('/api/recipes/' + r.json.id)).json.category, 'Danh mục lạ');
  assert.equal((await mk({ category: 'x'.repeat(100) })).status, 201);
  assert.ok(!(await a.get('/api/categories')).json.items.some((c) => c.name === cats[0].id && c.name !== cats[0].name));
  const url = (await a.post('/api/uploads', { dataUrl: PNG })).json.url;
  const rA = (await mk({ image: url })).json.id, rB = (await mk({ image: url })).json.id;
  await a.del('/api/recipes/' + rA);
  assert.equal((await fetch(base + url)).status, 200); // rB van dung
  assert.equal((await a.patch('/api/me', { avatar: url, currentPassword: 'secret1' })).status, 200);
  await a.del('/api/recipes/' + rB);
  assert.equal((await fetch(base + url)).status, 200); // avatar van dung
  const dir = inst.cfg.uploadsDir;
  const orphan = path.join(dir, 'orphan_old.png'), fresh = path.join(dir, 'orphan_new.png');
  fs.writeFileSync(orphan, 'x'); fs.writeFileSync(fresh, 'x');
  const old = new Date(Date.now() - 2 * 3600 * 1000); fs.utimesSync(orphan, old, old);
  inst.app.gcUploads();
  assert.equal(fs.existsSync(orphan), false); assert.equal(fs.existsSync(fresh), true); assert.equal(fs.existsSync(path.join(dir, path.basename(url))), true);
});

test('doi mat khau thu hoi phien khac; dang nhap don phien het han', async () => {
  const a = client(), b = client();
  await a.post('/api/auth/register', { username: 'pw_user', email: 'pw@x.vn', password: 'secret1' });
  await b.post('/api/auth/login', { identifier: 'pw_user', password: 'secret1' });
  assert.equal((await b.get('/api/me')).json.user.username, 'pw_user');
  assert.equal((await a.patch('/api/me', { newPassword: 'secret2', currentPassword: 'secret1' })).status, 200);
  assert.equal((await a.get('/api/me')).json.user.username, 'pw_user'); // phien hien tai con
  assert.equal((await b.get('/api/me')).json.user, null); // phien khac bi thu hoi
  inst.store.data.sessions.push({ id: 'expired', userId: 'u_x', createdAt: 1, expiresAt: 2 });
  await client().post('/api/auth/login', { identifier: 'pw_user', password: 'secret2' });
  assert.ok(!inst.store.data.sessions.some((s) => s.id === 'expired'));
});

test('fridge: chi bao du khi khop >= 2 nguyen lieu chinh (hoac cong thuc that chi can 1)', async () => {
  const a = client();
  const r = await a.get('/api/fridge?ingredients=thit-bo&limit=100');
  assert.ok(r.json.items.length > 0);
  for (const it of r.json.items) if (it.matched.length < 2) assert.equal(it.status, 'thieu', it.recipe.id);
  assert.ok(inst.store.data.recipes.filter((x) => x.legacyId).every((x) => x.main.length >= 2));
});

test('server mac dinh nghe 127.0.0.1', async () => {
  const x = createApp({ port: 0, dbFile: path.join(tmp, 'h.json'), uploadsDir: path.join(tmp, 'uploads-h'), quiet: true });
  assert.equal(x.cfg.host, '127.0.0.1');
});
