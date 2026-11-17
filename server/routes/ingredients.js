'use strict';
const { HttpError } = require('../lib/http');
const M = require('../lib/model');
const V = require('../lib/validate');
const { catalog, canonId, nameOf, findByName } = require('../lib/catalog');
const { norm, hash32 } = require('../lib/text');

// url: trang chủ của cửa hàng, dùng cho nút "MUA NGAY" (dữ liệu giá là số tham khảo, chưa lấy trực tiếp từ cửa hàng)
const STORES = [
  { store: 'BÁCH HÓA XANH', k: 0.97, url: 'https://www.bachhoaxanh.com/' }, { store: 'COOP FOOD', k: 1.06, url: 'https://cooponline.vn/' },
  { store: 'WINMART', k: 1.0, url: 'https://winmart.vn/' }, { store: 'SUNMART', k: 1.12, url: 'https://sunmart.vn/' },
  { store: 'GS25', k: 1.22, url: 'https://gs25.com.vn/' }, { store: 'CIRCLE K', k: 1.28, url: 'https://www.circlek.com.vn/' }
];
// Quy cách đóng gói gợi ý theo loại đơn vị, để mỗi cửa hàng có tên sản phẩm riêng
const PACKS = { mass: ['200g', '300g', '500g', '1kg'], volume: ['330ml', '500ml', '750ml', '1 lít'], count: ['vỉ 6', 'vỉ 10', '1 quả', 'túi 500g'] };
// Tên sản phẩm cụ thể đã biết (khớp với giá tham khảo bên dưới)
const KNOWN = { 'thit-heo': { 'BÁCH HÓA XANH': 'Thịt heo xay C.P 200g', 'COOP FOOD': 'Thịt heo xay kg-AHT990' } };
// Giá tham khảo (VND) theo đơn vị so sánh: 100g / 100ml / 1 đơn vị đếm
const BASE = {
  'thit-heo': 11069, 'thit-bo': 29000, 'thit-ga': 9500, 'tom-tuoi': 19000, 'ca-phi-le': 14000, 'trung-vit': 4500, 'gao-tam': 1800,
  'hanh-tim': 3000, 'hanh-la': 5000, 'toi-bam': 3500, 'ca-chua': 4000, 'ca-rot': 3500, 'khoai-tay': 2800, 'dau-hu': 3500,
  'nuoc-mam': 2500, 'nuoc-tuong': 2200, 'dau-an': 2400, 'duong-cat': 2200, 'muoi': 800, 'bun-tuoi': 2000, 'banh-mi': 3500, 'nam-huong': 12000
};
const UNIT_LABEL = { mass: '100g', volume: '100ml', count: 'quả' };

function compareOne(name) {
  const it = findByName(name);
  if (!it) return { name, id: null, unit: null, price: null, stores: [] };
  const unit = UNIT_LABEL[it.dimension] || '100g';
  const base = BASE[it.id] || (2000 + (hash32(it.id) % 20) * 500);
  const stores = STORES.map((s, i) => {
    const h = hash32(it.id + s.store);
    let price = Math.round((base * s.k * (0.95 + (h % 11) / 100)) / 10) * 10;
    if (it.id === 'thit-heo' && i === 0) price = 11069;
    if (it.id === 'thit-heo' && i === 1) price = 12700;
    const disc = [0, 10, 15, 20][h % 4];
    const pack = PACKS[it.dimension] || PACKS.mass;
    const product = (KNOWN[it.id] && KNOWN[it.id][s.store]) || (it.name + ' ' + pack[h % pack.length]);
    const o = { store: s.store, product, price, unit, url: s.url };
    if (disc) { o.oldPrice = Math.round(price / (1 - disc / 100) / 100) * 100; o.discount = disc; }
    return o;
  }).sort((a, b) => a.price - b.price);
  return { name: it.name, id: it.id, unit, price: stores[0].price, stores };
}

module.exports = function (app) {
  const r = app.router;

  // Chỉ trả danh mục chuẩn (không lẫn tên/đơn vị do người dùng tự nhập)
  r.get('/api/ingredients', () => ({ items: catalog.items, units: catalog.units }));

  r.get('/api/ingredients/compare', (ctx) => {
    const names = String(ctx.query.names || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.length) throw new HttpError(400, 'Vui lòng nhập ít nhất một nguyên liệu (names=a,b,c)', 'names');
    if (names.length > 20) throw new HttpError(400, 'Tối đa 20 nguyên liệu mỗi lần so sánh', 'names');
    return { items: names.map(compareOne) };
  });

  r.get('/api/fridge', (ctx) => {
    const raw = String(ctx.query.ingredients || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60);
    const limit = V.intParam(ctx.query, 'limit', 20, 1, 100);
    const kw = norm(ctx.query.q || '');
    const selFull = raw.map((t) => ({ group: t.includes(':') ? t.split(':')[0] : '', id: canonId(t) }));
    const selIds = new Set(selFull.map((s) => s.id));
    const selGroups = new Set(selFull.filter((s) => s.group).map((s) => s.group));
    const c = M.makeCtx(ctx.db, ctx.user);
    const out = [];
    for (const rec of ctx.db.recipes) {
      if (kw && !norm(rec.name).includes(kw)) continue;
      const main = (rec.main && rec.main.length ? rec.main : (rec.ingredients || []).map((i) => i.ingredientId)).slice(0, 8);
      const matched = [], missing = [];
      for (const m of main) {
        let label, hit;
        if (/:khac$/.test(m)) { const g = m.split(':')[0]; hit = selGroups.has(g); label = (g === 'dam' ? 'Đạm' : g === 'rau-cu' ? 'Rau củ' : g) + ' khác'; }
        else { hit = selIds.has(m); label = nameOf(m); }
        (hit ? matched : missing).push(label);
      }
      if (selIds.size && !matched.length) continue;
      const total = matched.length + missing.length;
      const score = total ? Math.round((matched.length / total) * 100) / 100 : 0;
      out.push({ recipe: M.cardOf(c, rec), matched, missing, score, status: selIds.size && !missing.length && (matched.length >= 2 || (main.length === 1 && !rec.legacyId)) ? 'du' : 'thieu' });
    }
    out.sort((a, b) => b.score - a.score || b.matched.length - a.matched.length || b.recipe.rating - a.recipe.rating || (a.recipe.id < b.recipe.id ? -1 : 1));
    return { items: out.slice(0, limit) };
  });
};
