'use strict';
// Tạo dữ liệu khởi tạo (idempotent: chỉ gọi khi db chưa có công thức).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { norm, slugify, hash32 } = require('./text');
const { catalog, canonId, SEED_DIR } = require('./catalog');
const { hashPasswordSync } = require('./hash');
const { generate } = require('./synth');
let IMAGE_MAP = {};
try { IMAGE_MAP = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'image-map.json'), 'utf8')); } catch (e) { /* chưa có */ }
const localImg = (u) => (IMAGE_MAP[u] && fs.existsSync(path.join(__dirname, '..', '..', 'public', IMAGE_MAP[u])) ? IMAGE_MAP[u] : u);

const STAPLES = new Set(['muoi', 'nuoc-mam', 'nuoc-tuong', 'bot-ngot', 'duong-cat', 'dau-an', 'hat-nem', 'tieu', 'dau-hao', 'mat-ong', 'nuoc-dung', 'ngu-vi-huong', 'tuong-ot', 'giam', 'ruou-trang', 'hoa-hoi', 'que', 'thao-qua', 'tuong-den', 'sua-dac', 'nuoc-dua', 'nuoc-cot-chanh']);

// Dữ liệu tìm công thức theo nguyên liệu của Thanh (cổng từ thanh-fridge-source.js)
const THANH = [
  { slug: 'bo-kho', name: 'Bò kho ăn kèm bánh mì', img: 'bo-kho.jpg', time: 30, needs: ['dam:thit-bo', 'tinh-bot:banh-mi'] },
  { slug: 'bo-kho', name: 'Bò kho sốt vang', img: 'bo-kho-sot-vang.jpg', time: 60, price: '180.000đ - 200.000đ', serving: '4 người', needs: ['dam:thit-bo', 'tinh-bot:banh-mi'] },
  { slug: 'bo-ne', name: 'Bò né', img: 'bo-ne.webp', time: 30, needs: ['dam:thit-bo', 'dam:trung', 'tinh-bot:banh-mi'] },
  { slug: 'bo-bit-tet', name: 'Bò bít tết', img: 'bo-bit-tet.jpg', time: 30, needs: ['dam:thit-bo', 'rau-cu:khac'] },
  { slug: 'bo-cuon-nam-kim-cham', name: 'Bò cuộn nấm kim châm', img: 'bo-cuon-nam-kim-cham.jpg', time: 30, needs: ['dam:thit-bo', 'rau-cu:khac'] },
  { slug: 'bo-la-lot', name: 'Bò lá lốt', img: 'bo-la-lot.webp', time: 30, needs: ['dam:thit-bo', 'rau-cu:khac'] },
  { slug: 'bo-luc-lac', name: 'Bò lúc lắc', img: 'bo-luc-lac.jpg', time: 30, needs: ['dam:thit-bo', 'rau-cu:khac'] },
  { slug: 'bo-xao-ot-chuong', name: 'Bò xào ớt chuông', img: 'bo-xao-ot-chuong.jpg', time: 30, needs: ['dam:thit-bo', 'rau-cu:khac'] },
  { slug: 'bo-xao-sa-ot', name: 'Bò xào sả ớt', img: 'bo-xao-sa-ot.webp', time: 30, needs: ['dam:thit-bo', 'rau-cu:khac'] },
  { slug: 'goi-xoai-xanh', name: 'Gỏi xoài xanh', img: 'goi-xoai-xanh.jpg', time: 20, price: '45.000đ - 65.000đ', serving: '2 - 3 người', needs: ['trai-cay:xoai-xanh'] },
  { slug: 'dau-hu-sot-ca-chua', name: 'Đậu hũ sốt cà chua', img: 'dau-hu-sot-ca-chua.webp', time: 35, price: '25.000đ - 35.000đ', serving: '2 - 3 người', needs: ['dam:dau-hu'] },
  { slug: 'canh-bau-nau-tom', name: 'Canh bầu nấu tôm', img: 'Canh-bau-nau-tom.jpg', time: 20, price: '50.000đ - 70.000đ', serving: '3 - 4 người', needs: ['dam:khac', 'rau-cu:khac'] },
  { slug: 'ga-kho-sa', name: 'Gà kho sả', img: 'ga-kho-sa.jpg', time: 45, price: '100.000đ - 150.000đ', serving: '3 - 4 người', needs: ['dam:thit-ga'] },
  { slug: 'com-chien-trung', name: 'Cơm chiên trứng', img: 'com-chien-trung.jpg', time: 15, price: '20.000đ - 30.000đ', serving: '1 - 2 người', needs: ['tinh-bot:gao', 'dam:trung'] },
  { slug: 'ca-nuong-muoi-ot', name: 'Cá nướng muối ớt', img: 'ca-nuong-muoi-ot.jpg', time: 30, price: '130.000đ - 160.000đ', serving: '3 - 4 người', needs: ['dam:khac'] },
  { slug: 'bun-thit-nuong', name: 'Bún thịt nướng', img: 'bun-thit-nuong.jpg', time: 30, price: '90.000đ - 120.000đ', serving: '2 - 3 người', needs: ['tinh-bot:bun', 'dam:thit-heo'] },
  { slug: 'ca-sot-ca', name: 'Cá sốt cà', img: 'ca-sot-ca.jpg', time: 30, price: '60.000đ - 80.000đ', serving: '2 - 3 người', needs: ['dam:khac'] }
];

const SEED_CATEGORY = {
  'banh-mi-thit-nuong': 'Bánh mì', 'bo-kho': 'Món bò', 'ca-nuong-muoi-ot': 'Món cá', 'canh-bau-nau-tom': 'Canh',
  'com-chien-trung': 'Cơm', 'com-tam-long-xuyen': 'Cơm', 'ga-kho-sa': 'Món gà', 'goi-xoai-xanh': 'Gỏi & salad'
};

function deriveCategory(name, tags) {
  const n = norm(name);
  const t = new Set((tags || []).map(norm));
  if (/(^|\s)(canh|sup|lau)(\s|$)/.test(n)) return 'Canh';
  if (t.has('trang mieng') || /(^|\s)(che|kem|banh flan|pudding|sinh to|yaourt)(\s|$)/.test(n)) return 'Tráng miệng';
  if (t.has('an chay')) return 'Món chay';
  if (/^(com|xoi)(\s|$)/.test(n)) return 'Cơm';
  if (/^(bun|pho|mien|hu tieu|banh canh|mi)(\s|$)/.test(n) || t.has('bun / pho')) return 'Bún / Phở';
  if (/^banh mi/.test(n) || t.has('banh mi')) return 'Bánh mì';
  if (/^goi(\s|$)|salad/.test(n)) return 'Gỏi & salad';
  if (t.has('thit bo')) return 'Món bò';
  if (t.has('thit ga')) return 'Món gà';
  if (t.has('hai san') || /(^|\s)(tom|muc|ca|cua|ngheu|so)(\s|$)/.test(n)) return /(^|\s)ca(\s|$)/.test(n) ? 'Món cá' : 'Hải sản';
  if (t.has('thit heo')) return 'Món heo';
  if (t.has('com')) return 'Cơm';
  if (t.has('nam') || t.has('rau xanh') || t.has('cu qua') || t.has('thanh dam') || t.has('eat clean')) return 'Rau củ & thanh đạm';
  if (t.has('mon a')) return 'Món Á';
  return 'Món khác';
}

function parsePrice(s) { const d = String(s || '').replace(/[^\d]/g, ''); return d ? Number(d) : 0; }
function parseTime(s) { const m = String(s || '').match(/\d+/); return m ? Number(m[0]) : 30; }
function priceRange(s) {
  const nums = (String(s || '').match(/\d[\d.]*/g) || []).map((x) => Number(x.replace(/\./g, '')));
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Nguyên liệu chính suy ra từ tag/tên (cho thẻ Phat và thẻ Thanh).
function mainFromCard(name, tags) {
  const n = ' ' + norm(name) + ' ';
  const t = new Set((tags || []).map(norm));
  const out = [];
  const add = (id) => { if (id && !out.includes(id)) out.push(id); };
  if (t.has('thit bo') || /\sbo\s/.test(n)) add('thit-bo');
  if (t.has('thit heo') || /\s(heo|suon|ba roi|thit nuong|cha)\s/.test(n)) add('thit-heo');
  if (t.has('thit ga') || /\sga\s/.test(n)) add('thit-ga');
  if (t.has('hai san')) add(/\sca\s/.test(n) ? 'ca-phi-le' : /\smuc\s/.test(n) ? 'muc' : 'tom-tuoi');
  if (/\stom\s/.test(n)) add('tom-tuoi');
  if (/\sca\s/.test(n) && !/\sca (chua|rot|tim|phe)/.test(n)) add('ca-phi-le');
  if (/\smuc\s/.test(n)) add('muc');
  if (/\strung\s/.test(n)) add('trung-vit');
  if (t.has('com') || /^ ?(com|xoi)\s/.test(n)) add('gao-tam');
  if (/\spho\s/.test(n)) add('banh-pho'); else if (t.has('bun / pho') || /\sbun\s/.test(n)) add('bun-tuoi');
  if (t.has('banh mi') || /\sbanh mi\s/.test(n)) add('banh-mi');
  if (t.has('nam') || /\snam\s/.test(n)) add(/\srom\s/.test(n) ? 'nam-rom' : 'nam-huong');
  if (/\sdau (hu|phu)\s/.test(n) || t.has('an chay')) add('dau-hu');
  if (/\sca chua\s/.test(n)) add('ca-chua');
  if (/\sca tim\s/.test(n)) add('ca-tim');
  if (/\skhoai tay\s/.test(n)) add('khoai-tay');
  if (/\sbi do\s/.test(n)) add('bi-do');
  if (/\ssa\s/.test(n)) add('sa');
  if (/\srau muong\s/.test(n)) add('rau-muong');
  else if (/\scai\s/.test(n)) add('rau-cai');
  if (t.has('cu qua')) add(out.length < 3 ? 'ca-rot' : null);
  if (t.has('rau xanh') && out.length < 3) add('rau-muong');
  if (t.has('trai cay nhiet doi') || t.has('trang mieng')) add(/\sxoai\s/.test(n) ? 'xoai-xanh' : 'trai-cay');
  if (!out.length) add('trai-cay');
  return out.slice(0, 5);
}

const STAPLE_POOL = ['muoi', 'nuoc-mam', 'duong-cat', 'toi-bam', 'hanh-tim', 'tieu', 'dau-an', 'hat-nem'];

function qtyFor(id, h) {
  const it = catalog.byId.get(id) || { dimension: 'mass', defaultUnit: 'g' };
  const unit = it.defaultUnit || 'g';
  if (it.dimension === 'count') return { qty: 1 + (h % 3), unit };
  if (it.dimension === 'volume') return { qty: 10 * (1 + (h % 5)), unit };
  const big = !STAPLES.has(id) && !['toi-bam', 'hanh-tim'].includes(id);
  return { qty: big ? 100 * (2 + (h % 4)) : 5 * (1 + (h % 4)), unit };
}

function synthIngredients(main, seedKey) {
  const list = [];
  const h0 = hash32(seedKey);
  main.forEach((id, i) => { const q = qtyFor(id, h0 >>> (i * 3)); list.push({ ingredientId: id, qty: q.qty, unit: q.unit }); });
  for (let k = 0; k < 5; k++) {
    const id = STAPLE_POOL[(h0 + k * 3) % STAPLE_POOL.length];
    if (list.some((x) => x.ingredientId === id)) continue;
    const q = qtyFor(id, h0 >>> (k + 1));
    list.push({ ingredientId: id, qty: q.qty, unit: q.unit });
    if (list.length >= main.length + 4) break;
  }
  return list;
}

function synthDetails(name, image, time, main, id) {
  const lname = name.charAt(0).toLowerCase() + name.slice(1);
  const mainNames = main.map((m) => (catalog.byId.get(m) || { name: m }).name.toLowerCase());
  const mains = mainNames.join(', ') || 'nguyên liệu chính';
  const h = hash32(id);
  const quickSteps = [
    'Sơ chế: Rửa sạch và cắt nhỏ ' + mains + '.',
    'Ướp: Ướp nguyên liệu chính với gia vị khoảng 15 phút cho thấm.',
    'Nấu: Chế biến ' + lname + ' trên lửa vừa cho đến khi chín tới.',
    'Nêm nếm: Nêm lại cho vừa ăn rồi tắt bếp.',
    'Trình bày: Bày ra đĩa, ăn nóng cùng rau sống hoặc đồ ăn kèm.'
  ];
  const steps = [
    ['Rửa sạch ' + mains + ', để ráo nước.', 'Cắt thành miếng vừa ăn; tỏi, hành băm nhỏ.'],
    ['Cho nguyên liệu chính vào tô, thêm gia vị đã chuẩn bị.', 'Trộn đều và ướp khoảng 15 phút.'],
    ['Bắc chảo lên bếp, đun nóng dầu ăn, phi thơm tỏi và hành.', 'Cho nguyên liệu vào nấu trên lửa vừa khoảng ' + Math.max(5, Math.round(time * 0.5)) + ' phút.'],
    ['Nêm nếm lại cho vừa ăn, đảo đều thêm vài phút rồi tắt bếp.'],
    ['Bày ' + lname + ' ra đĩa, ăn nóng.', 'Có thể dùng kèm rau sống hoặc nước chấm tùy khẩu vị.']
  ].map((text) => ({ text, images: [image] }));
  const kcal = 280 + (h % 40) * 10;
  const nutrition = {
    servings: 1, calories: kcal + ' kcal', carbs: (20 + (h % 40)) + 'g', protein: (12 + (h % 30)) + 'g',
    fat: (8 + (h % 22)) + 'g', sodium: (700 + (h % 10) * 80) + ' mg', fiber: (2 + (h % 5)) + 'g'
  };
  return { quickSteps, steps, nutrition };
}

function padMain(main, name) {
  const out = main.slice();
  const n = ' ' + norm(name) + ' ';
  if (out.length < 2) {
    const extra = /ssot ca chuas|ca chua/.test(n) ? 'ca-chua' : (out.includes('trai-cay') || /tang|che|kem|trang mieng/.test(n)) ? 'duong-cat' : ['hanh-tim', 'toi-bam', 'hanh-la'][hash32(name) % 3];
    if (!out.includes(extra)) out.push(extra);
  }
  return out;
}

function rateFor(id) {
  const h = hash32('rating:' + id);
  return { seedRating: Math.round((3.8 + (h % 12) / 10) * 10) / 10, seedCount: 6 + (h % 230) };
}

function rewriteImg(slug, p) {
  if (typeof p !== 'string') return p;
  if (/^(https?:)?\/\//.test(p) || p.startsWith('/')) return p;
  return '/assets/images/recipes/' + slug + '/' + p.replace(/^\.?\/?images\//, '').replace(/^\.?\//, '');
}

function fromFull(slug, j, idx) {
  const fix = (p) => (p && typeof p === 'object' ? Object.assign({}, p, { src: rewriteImg(slug, p.src) }) : rewriteImg(slug, p));
  const gallery = (j.gallery || []).map(fix);
  const prep = Number(j.prepTime) || 0; const cook = Number(j.cookTime) || 0;
  const servings = Number(j.baseServings) || 1;
  const main = [];
  for (const ing of j.ingredients || []) {
    if (!ing.ingredientId || ing.group) continue;
    if (STAPLES.has(ing.ingredientId)) continue;
    if (!main.includes(ing.ingredientId)) main.push(ing.ingredientId);
  }
  const parts = String(j.uploaded || '').split('/');
  const created = parts.length === 3 ? new Date(Date.UTC(+parts[2], +parts[1] - 1, +parts[0])).toISOString() : new Date(Date.UTC(2026, 0, 1 + idx)).toISOString();
  return Object.assign({
    id: slug, name: j.title, category: SEED_CATEGORY[slug] || deriveCategory(j.title, []),
    categoryGroup: j.category, image: gallery[0] && typeof gallery[0] === 'string' ? gallery[0] : (gallery[0] || {}).src,
    gallery, steps: (j.steps || []).map((s) => ({ text: s.text, images: (s.images || []).map(fix) })),
    similar: (j.similar || []).map((s) => s.id).filter(Boolean),
    price: Math.round((Number(j.costTotal) || 0) / servings), time: prep + cook, authorId: null,
    createdAt: created, tags: [j.subcategory, j.category].filter(Boolean), main: main.slice(0, 6)
  }, {
    title: j.title, subcategory: j.subcategory || '', description: j.description || '', summary: j.summary || '',
    prepTime: prep, cookTime: cook, baseServings: servings, costTotal: Number(j.costTotal) || 0,
    ingredients: j.ingredients || [], quickSteps: j.quickSteps || [], nutrition: j.nutrition || {}
  }, rateFor(slug));
}

function fromCard(id, c, used, idx) {
  let slug = slugify(c.name) || id;
  if (used.has(slug)) slug = slug + '-' + id.replace(/[^0-9a-z]/gi, '').toLowerCase();
  used.add(slug);
  const time = parseTime(c.time);
  const price = parsePrice(c.price);
  const tags = c.tags || [];
  const gen = generate(c.name, tags, time, slug);
  const main = gen.main;
  const prep = Math.max(5, Math.round(time * 0.3));
  const d = synthDetails(c.name, c.image, time, main, slug);
  d.quickSteps = gen.quickSteps;
  d.steps = gen.steps.map((st) => ({ text: st.text, images: [c.image] }));
  return Object.assign({
    id: slug, legacyId: c.id, name: c.name, title: c.name, category: deriveCategory(c.name, tags),
    categoryGroup: 'Công thức cộng đồng', subcategory: tags[0] || '', image: c.image, gallery: [c.image, c.image, c.image, c.image],
    price, time, authorId: null, createdAt: new Date(Date.UTC(2026, 0, 1 + idx)).toISOString(), tags, main,
    description: gen.description + (price ? ' Chi phí khoảng ' + price.toLocaleString('vi-VN') + 'đ mỗi phần.' : ''),
    summary: gen.summary,
    prepTime: prep, cookTime: Math.max(5, time - prep), baseServings: 2, costTotal: price * 2,
    ingredients: gen.ingredients, similar: []
  }, d, rateFor(slug));
}

function fromThanh(t, used, idx) {
  const rec = fromCard('fridge', { name: t.name, price: '', time: String(t.time), image: '/assets/images/dishes/' + t.img, tags: [] }, used, idx);
  const servings = Math.max(1, Number((String(t.serving || '').match(/\d+/g) || ['2']).pop()));
  const total = priceRange(t.price) || 80000;
  rec.price = Math.round(total / servings / 1000) * 1000; rec.baseServings = servings; rec.costTotal = Math.round(total / 1000) * 1000;
  rec.legacyId = 'fridge:' + t.slug;
  const names = new Map([['thit-bo', 'thit-bo'], ['banh-mi', 'banh-mi'], ['trung', 'trung-vit']]);
  const main = [];
  for (const need of t.needs) {
    if (/:khac$/.test(need)) { main.push(need); continue; }
    const id = names.get(need.split(':')[1]) || canonId(need);
    if (!main.includes(id)) main.push(id);
  }
  const real = main.filter((m) => !/:khac$/.test(m));
  // đảm bảo nguyên liệu chính của Thanh có trong danh sách thật
  for (const id of real) if (!rec.ingredients.some((i) => i.ingredientId === id)) {
    const q = qtyFor(id, hash32(rec.id));
    rec.ingredients.splice(Math.min(1, rec.ingredients.length), 0, { ingredientId: id, qty: q.qty, unit: q.unit });
    if (rec.ingredients.length > 10) rec.ingredients.pop();
  }
  rec.main = main.length >= 2 ? main : real.concat(rec.main.filter((m) => !real.includes(m))).slice(0, Math.max(2, real.length));
  rec.tags = t.needs.slice();
  rec.category = deriveCategory(t.name, rec.main.includes('thit-bo') ? ['Thịt bò'] : []);
  return rec;
}

function makeUser(id, username, email, pw, i) {
  return { id, username, email, avatar: null, passwordHash: hashPasswordSync(pw), createdAt: new Date(Date.UTC(2026, 5, 1 + i)).toISOString() };
}

function build(opts) {
  opts = opts || {};
  const recipes = [];
  const used = new Set();
  const byId = new Map();
  const push = (r) => { recipes.push(r); byId.set(r.id, r); used.add(r.id); };

  // 1) 8 công thức đầy đủ
  const dir = path.join(SEED_DIR, 'recipes');
  let idx = 0;
  for (const slug of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, slug, 'recipe.json');
    if (!fs.existsSync(f)) continue;
    push(fromFull(slug, JSON.parse(fs.readFileSync(f, 'utf8')), idx++));
  }
  // 2) công thức của Thanh (gộp vào bản đầy đủ nếu cùng slug)
  const seenThanh = new Set();
  for (const t of THANH) {
    if (byId.has(t.slug) && !seenThanh.has(t.slug)) { seenThanh.add(t.slug); continue; }
    seenThanh.add(t.slug);
    push(fromThanh(t, used, idx++));
  }
  // 3) thẻ của Phat
  const p = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'phat-recipes.json'), 'utf8'));
  const cards = [];
  (function collect(v) {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') { if (v.id && v.name && v.image) cards.push(v); else Object.values(v).forEach(collect); }
  })(p);
  const merged = new Map();
  for (const c of cards) {
    const e = merged.get(c.id);
    if (!e) merged.set(c.id, Object.assign({}, c, { tags: (c.tags || []).slice() }));
    else for (const t of c.tags || []) if (!e.tags.includes(t)) e.tags.push(t);
  }
  for (const c of merged.values()) push(fromCard(c.id, Object.assign({}, c, { image: localImg(c.image) }), used, idx++));

  // Người dùng
  const demo = makeUser('u_demo', 'demo', 'demo@nomnom.vn', 'demo123', 0);
  const u2 = makeUser('u_minhanh', 'minh_anh', 'minhanh@nomnom.vn', crypto.randomBytes(12).toString('hex'), 1);
  const u3 = makeUser('u_hoatran', 'hoa.tran', 'hoatran@nomnom.vn', crypto.randomBytes(12).toString('hex'), 2);
  const users = [demo, u2, u3];

  // Công thức demo tải lên
  const now = Date.now();
  const mk = (slug, name, category, time, price, img, ings, steps, desc) => ({
    id: slug, name, title: name, category, categoryGroup: 'Công thức cộng đồng', subcategory: '', image: img, gallery: [img],
    price, time, authorId: 'u_demo', createdAt: new Date(now - 86400000).toISOString(), tags: [category], description: desc, summary: desc,
    prepTime: Math.round(time * 0.3), cookTime: time - Math.round(time * 0.3), baseServings: 2, costTotal: price * 2,
    ingredients: ings.map((x) => ({ ingredientId: x[0], qty: x[1], unit: x[2] })), main: ings.slice(0, 3).map((x) => x[0]),
    quickSteps: steps, steps: steps.map((s) => ({ text: [s], images: [] })), nutrition: { servings: 1, calories: '450 kcal', carbs: '40g', protein: '25g', fat: '18g', sodium: '900 mg', fiber: '3g' },
    similar: [], uploaded: '15/11/2026', seedRating: 0, seedCount: 0
  });
  recipes.push(mk('trung-chien-hanh-la', 'Trứng chiên hành lá', 'Món khác', 10, 12000, '/assets/images/recipes/com-chien-trung/image1.jpg',
    [['trung-vit', 3, 'quả'], ['hanh-la', 1, 'bó'], ['nuoc-mam', 10, 'ml'], ['dau-an', 15, 'ml']],
    ['Đập trứng vào tô, thêm hành lá cắt nhỏ và nước mắm, đánh đều.', 'Đun nóng dầu, đổ trứng vào chiên vàng hai mặt.', 'Cắt miếng, bày ra đĩa ăn nóng với cơm.'], 'Món trứng chiên nhanh gọn cho bữa cơm bận rộn.'));
  recipes.push(mk('ca-chua-xao-trung', 'Cà chua xào trứng', 'Món khác', 15, 15000, '/assets/images/recipes/canh-bau-nau-tom/image1.jpg',
    [['ca-chua', 3, 'quả'], ['trung-vit', 2, 'quả'], ['hanh-tim', 1, 'củ'], ['duong-cat', 5, 'g']],
    ['Cà chua cắt múi cau, hành tím băm.', 'Xào hành tím với cà chua đến khi mềm, nêm đường và muối.', 'Đổ trứng đã đánh vào, đảo đều đến khi chín.'], 'Món xào đơn giản, đậm đà, hợp ăn với cơm trắng.'));
  for (const r of recipes.slice(-2)) byId.set(r.id, r);

  // Đánh giá
  const reviews = [];
  let rn = 0;
  const rv = (uid, rid, rating, text, daysAgo, likedBy) => reviews.push({ id: 'rv_seed' + (++rn), recipeId: rid, userId: uid, rating, text, createdAt: new Date(now - daysAgo * 86400000).toISOString(), likedBy: likedBy || [] });
  rv('u_demo', 'bo-kho', 5, 'Thịt mềm, nước kho thơm, cả nhà rất thích!', 3, ['u_minhanh', 'u_hoatran']);
  rv('u_demo', 'com-tam-long-xuyen', 4, 'Sườn nướng ngon, nước mắm pha chuẩn vị.', 5, ['u_minhanh']);
  rv('u_demo', 'ga-kho-sa', 5, 'Gà kho sả thơm lừng, rất đưa cơm.', 7, []);
  rv('u_demo', 'canh-bau-nau-tom', 4, 'Canh thanh mát, nấu nhanh.', 9, ['u_hoatran']);
  rv('u_minhanh', 'bo-kho', 4, 'Hầm lâu hơn một chút thì thịt sẽ mềm hơn nữa.', 4, ['u_demo']);
  rv('u_hoatran', 'bo-kho', 5, 'Công thức dễ làm, hương vị chuẩn miền Nam.', 2, []);
  rv('u_minhanh', 'goi-xoai-xanh', 5, 'Gỏi chua ngọt cân bằng, rất hợp ngày nóng.', 6, ['u_demo']);
  rv('u_hoatran', 'com-chien-trung', 4, 'Cơm chiên nhanh gọn, ngon.', 8, []);

  const saved = ['bo-kho', 'com-tam-long-xuyen', 'goi-xoai-xanh', 'ga-kho-sa'].map((rid, i) => ({ userId: 'u_demo', recipeId: rid, at: new Date(now - (i + 1) * 3600000).toISOString() }));
  const hist = ['canh-bau-nau-tom', 'bo-kho', 'banh-mi-thit-nuong', 'com-chien-trung'];
  const history = hist.map((rid, i) => ({ userId: 'u_demo', recipeId: rid, at: new Date(now - (i + 1) * 1800000).toISOString() }));

  return { version: 1, createdAt: new Date().toISOString(), users, sessions: [], recipes, saved, reviews, history, contacts: [] };
}
module.exports = { build, deriveCategory, STAPLES };
