'use strict';
const fs = require('fs');
const path = require('path');
const { norm, slugify } = require('./text');

const SEED_DIR = path.join(__dirname, '..', 'seed');

// Nguyên liệu bổ sung (có trong công thức nhưng chưa có trong ingredients.json)
const EXTRA = [
  { id: 'ca-phi-le', name: 'Cá phi lê', aliases: ['cá', 'ca'], dimension: 'mass', defaultUnit: 'g' },
  { id: 'ca-dieu-hong', name: 'Cá diêu hồng', aliases: ['cá diêu hồng'], dimension: 'mass', defaultUnit: 'g' },
  { id: 'muc', name: 'Mực', aliases: ['mực', 'muc'], dimension: 'mass', defaultUnit: 'g' },
  { id: 'rau-cai', name: 'Rau cải', aliases: ['cải', 'rau cai'], dimension: 'mass', defaultUnit: 'g' },
  { id: 'bi-do', name: 'Bí đỏ', aliases: ['bí', 'bi do'], dimension: 'mass', defaultUnit: 'g' },
  { id: 'trai-cay', name: 'Trái cây theo mùa', aliases: ['trái cây', 'hoa quả'], dimension: 'mass', defaultUnit: 'g' },
  { id: 'xoai-xanh', name: 'Xoài xanh', aliases: ['xoài', 'xoai'], dimension: 'count', units: ['quả', 'trái'], defaultUnit: 'quả' },
  { id: 'dau-phong', name: 'Đậu phộng', aliases: ['đậu phụng', 'lạc'], dimension: 'mass', defaultUnit: 'g' },
  { id: 'bau', name: 'Bầu', aliases: ['bầu', 'bau'], dimension: 'count', units: ['quả', 'trái'], defaultUnit: 'quả' },
  { id: 'bap-cai', name: 'Bắp cải', aliases: ['bắp cải', 'bap cai'], dimension: 'mass', defaultUnit: 'g' },
  { id: 'dau-phu-non', name: 'Đậu hũ non', aliases: ['đậu hũ non'], dimension: 'mass', defaultUnit: 'g' }
];

const SYNONYMS = {
  trung: 'trung-vit', gao: 'gao-tam', hanh: 'hanh-tim', toi: 'toi-bam', 'thit-lon': 'thit-heo',
  bun: 'bun-tuoi', pho: 'banh-pho', 'dau-phu': 'dau-hu', 'ca-chua-bi': 'ca-chua', tom: 'tom-tuoi',
  nam: 'nam-huong', 'ca-hoi': 'ca-phi-le', xoai: 'xoai-xanh'
};

function load() {
  const items = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'ingredients.json'), 'utf8'));
  const units = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'units.json'), 'utf8'));
  const byId = new Map();
  for (const it of items.concat(EXTRA)) if (!byId.has(it.id)) byId.set(it.id, it);
  const aliasMap = new Map();
  for (const it of byId.values()) {
    aliasMap.set(it.id, it.id);
    aliasMap.set(norm(it.name), it.id);
  }
  for (const it of byId.values()) for (const a of it.aliases || []) if (!aliasMap.has(norm(a))) aliasMap.set(norm(a), it.id);
  return { items: Array.from(byId.values()), units, byId, aliasMap };
}
const catalog = load();

// Đưa một chuỗi (id, tên, "nhom:id") về id nguyên liệu chuẩn.
function canonId(token) {
  let t = String(token || '').trim();
  if (t.indexOf(':') > 0) t = t.slice(t.indexOf(':') + 1);
  const n = norm(t);
  if (!n) return '';
  const slug = n.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (catalog.byId.has(slug)) return slug;
  if (SYNONYMS[slug]) return SYNONYMS[slug];
  if (catalog.aliasMap.has(n)) return catalog.aliasMap.get(n);
  return slug;
}
function nameOf(id) {
  const it = catalog.byId.get(id);
  return it ? it.name : id;
}
// Tìm nguyên liệu theo tên (cho so sánh giá): khớp chính xác rồi khớp chứa.
function findByName(text, exact) {
  const n = norm(text);
  if (!n) return null;
  const direct = catalog.aliasMap.get(n) || catalog.aliasMap.get(n.replace(/ /g, '-'));
  if (direct) return catalog.byId.get(direct);
  if (exact) return null;
  for (const it of catalog.byId.values()) {
    if (norm(it.name).includes(n) || n.includes(norm(it.name))) return it;
    for (const a of it.aliases || []) { const na = norm(a); if (na.length > 2 && (na === n || n.includes(na))) return it; }
  }
  return null;
}
module.exports = { catalog, canonId, nameOf, findByName, slugify, SEED_DIR };
