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

const EXTRA2 = [
  {"id":"la-chanh","name":"Lá chanh","aliases":["lá chanh"],"dimension":"mass","defaultUnit":"g"},
  {"id":"suon-heo","name":"Sườn heo","aliases":["sườn"],"dimension":"mass","defaultUnit":"g"},
  {"id":"ba-chi","name":"Thịt ba chỉ","aliases":["ba chỉ","ba rọi"],"dimension":"mass","defaultUnit":"g"},
  {"id":"ca-hoi","name":"Cá hồi","aliases":["cá hồi"],"dimension":"mass","defaultUnit":"g"},
  {"id":"ca-loc","name":"Cá lóc","aliases":["cá lóc"],"dimension":"mass","defaultUnit":"g"},
  {"id":"cua","name":"Cua","aliases":["cua"],"dimension":"mass","defaultUnit":"g"},
  {"id":"ngheu","name":"Nghêu","aliases":["nghêu"],"dimension":"mass","defaultUnit":"g"},
  {"id":"bot-ca-ri","name":"Bột cà ri","aliases":["cà ri","cari"],"dimension":"mass","defaultUnit":"g"},
  {"id":"sa-te","name":"Sa tế","aliases":["sa tế"],"dimension":"mass","defaultUnit":"g"},
  {"id":"me","name":"Me","aliases":["me"],"dimension":"mass","defaultUnit":"g"},
  {"id":"chanh-day","name":"Chanh dây","aliases":["chanh dây"],"dimension":"count","defaultUnit":"quả","units":["quả","trái"]},
  {"id":"bo-trai","name":"Bơ (trái)","aliases":["trái bơ"],"dimension":"count","defaultUnit":"quả","units":["quả","trái"]},
  {"id":"bo-lat","name":"Bơ lạt","aliases":["bơ lạt"],"dimension":"mass","defaultUnit":"g"},
  {"id":"kem-tuoi","name":"Kem tươi","aliases":["kem tươi"],"dimension":"volume","defaultUnit":"ml"},
  {"id":"sua-tuoi","name":"Sữa tươi","aliases":["sữa tươi"],"dimension":"volume","defaultUnit":"ml"},
  {"id":"sua-chua","name":"Sữa chua","aliases":["sữa chua"],"dimension":"mass","defaultUnit":"g"},
  {"id":"xoai","name":"Xoài chín","aliases":["xoài chín"],"dimension":"count","defaultUnit":"quả","units":["quả","trái"]},
  {"id":"chuoi","name":"Chuối","aliases":["chuối"],"dimension":"count","defaultUnit":"quả","units":["quả","trái"]},
  {"id":"dau-xanh","name":"Đậu xanh","aliases":["đậu xanh"],"dimension":"mass","defaultUnit":"g"},
  {"id":"hat-sen","name":"Hạt sen","aliases":["hạt sen"],"dimension":"mass","defaultUnit":"g"},
  {"id":"long-nhan","name":"Long nhãn","aliases":["nhãn"],"dimension":"mass","defaultUnit":"g"},
  {"id":"mien","name":"Miến","aliases":["miến"],"dimension":"mass","defaultUnit":"g"},
  {"id":"mi-y","name":"Mì ý","aliases":["mì ý"],"dimension":"mass","defaultUnit":"g"},
  {"id":"mi-quang","name":"Mì quảng","aliases":["mì quảng"],"dimension":"mass","defaultUnit":"g"},
  {"id":"hu-tieu","name":"Hủ tiếu","aliases":["hủ tiếu"],"dimension":"mass","defaultUnit":"g"},
  {"id":"banh-trang","name":"Bánh tráng","aliases":["bánh tráng"],"dimension":"mass","defaultUnit":"g"},
  {"id":"rau-song","name":"Rau sống","aliases":["rau sống"],"dimension":"mass","defaultUnit":"g"},
  {"id":"rau-ram","name":"Rau răm","aliases":["rau răm"],"dimension":"mass","defaultUnit":"g"},
  {"id":"me-rang","name":"Mè rang","aliases":["mè"],"dimension":"mass","defaultUnit":"g"},
  {"id":"khoai-lang","name":"Khoai lang","aliases":["khoai lang"],"dimension":"count","defaultUnit":"củ","units":["củ"]},
  {"id":"khoai-mon","name":"Khoai môn","aliases":["khoai môn"],"dimension":"count","defaultUnit":"củ","units":["củ"]},
  {"id":"bong-cai","name":"Bông cải xanh","aliases":["bông cải"],"dimension":"mass","defaultUnit":"g"},
  {"id":"kho-qua","name":"Khổ qua","aliases":["mướp đắng"],"dimension":"count","defaultUnit":"quả","units":["quả","trái"]},
  {"id":"rong-bien","name":"Rong biển","aliases":["rong biển"],"dimension":"mass","defaultUnit":"g"},
  {"id":"nam-kim-cham","name":"Nấm kim châm","aliases":["kim châm"],"dimension":"mass","defaultUnit":"g"},
  {"id":"nam-dong-co","name":"Nấm đông cô","aliases":["đông cô"],"dimension":"mass","defaultUnit":"g"},
  {"id":"nam-bao-ngu","name":"Nấm bào ngư","aliases":["bào ngư"],"dimension":"mass","defaultUnit":"g"},
  {"id":"nam-meo","name":"Nấm mèo","aliases":["mộc nhĩ"],"dimension":"mass","defaultUnit":"g"},
  {"id":"nam-tuyet","name":"Nấm tuyết","aliases":["nấm tuyết"],"dimension":"mass","defaultUnit":"g"},
  {"id":"dau-o-liu","name":"Dầu ô liu","aliases":["dầu oliu"],"dimension":"volume","defaultUnit":"ml"},
  {"id":"bot-chien-gion","name":"Bột chiên giòn","aliases":["bột chiên"],"dimension":"mass","defaultUnit":"g"},
  {"id":"la-lot","name":"Lá lốt","aliases":["lá lốt"],"dimension":"mass","defaultUnit":"g"},
  {"id":"ot-chuong","name":"Ớt chuông","aliases":["ớt chuông"],"dimension":"count","defaultUnit":"quả","units":["quả","trái"]},
  {"id":"can-tay","name":"Cần tây","aliases":["cần tây"],"dimension":"mass","defaultUnit":"g"},
  {"id":"xa-lach","name":"Xà lách","aliases":["xà lách"],"dimension":"mass","defaultUnit":"g"},
  {"id":"thom","name":"Dứa (thơm)","aliases":["dứa","thơm"],"dimension":"count","defaultUnit":"quả","units":["quả","trái"]},
  {"id":"lap-xuong","name":"Lạp xưởng","aliases":["lạp xưởng"],"dimension":"mass","defaultUnit":"g"},
  {"id":"cha-lua","name":"Chả lụa","aliases":["chả lụa"],"dimension":"mass","defaultUnit":"g"},
  {"id":"ruou-vang","name":"Rượu vang đỏ","aliases":["rượu vang"],"dimension":"volume","defaultUnit":"ml"},
  {"id":"nghe","name":"Nghệ tươi","aliases":["nghệ"],"dimension":"mass","defaultUnit":"g"},
  {"id":"duong-den","name":"Đường đen","aliases":["đường đen"],"dimension":"mass","defaultUnit":"g"},
  {"id":"hanh-nhan","name":"Hạnh nhân","aliases":["hạnh nhân"],"dimension":"mass","defaultUnit":"g"},
  {"id":"hat-dieu","name":"Hạt điều","aliases":["hạt điều"],"dimension":"mass","defaultUnit":"g"},
  {"id":"hat-chia","name":"Hạt chia","aliases":["hạt chia"],"dimension":"mass","defaultUnit":"g"},
  {"id":"tao-do","name":"Táo đỏ","aliases":["táo đỏ"],"dimension":"mass","defaultUnit":"g"},
  {"id":"cai-thia","name":"Cải thìa","aliases":["cải thìa"],"dimension":"mass","defaultUnit":"g"},
  {"id":"ngo-non","name":"Ngô non","aliases":["ngô non"],"dimension":"mass","defaultUnit":"g"},
  {"id":"mang","name":"Măng","aliases":["măng"],"dimension":"mass","defaultUnit":"g"},
  {"id":"ngo-sen","name":"Ngó sen","aliases":["ngó sen"],"dimension":"mass","defaultUnit":"g"},
  {"id":"cu-sen","name":"Củ sen","aliases":["củ sen"],"dimension":"mass","defaultUnit":"g"},
  {"id":"bong-thien-ly","name":"Bông thiên lý","aliases":["thiên lý"],"dimension":"mass","defaultUnit":"g"},
  {"id":"gia-do","name":"Giá đỗ","aliases":["giá"],"dimension":"mass","defaultUnit":"g"},
  {"id":"dua-cai","name":"Dưa cải chua","aliases":["dưa cải"],"dimension":"mass","defaultUnit":"g"},
  {"id":"rau-cau","name":"Bột rau câu","aliases":["rau câu"],"dimension":"mass","defaultUnit":"g"},
  {"id":"la-e","name":"Lá é","aliases":["lá é"],"dimension":"mass","defaultUnit":"g"},
  {"id":"thi-la","name":"Thì là","aliases":["thì là"],"dimension":"mass","defaultUnit":"g"},
  {"id":"gao-nep","name":"Gạo nếp","aliases":["nếp"],"dimension":"mass","defaultUnit":"g"},
  {"id":"tran-chau","name":"Trân châu","aliases":["trân châu"],"dimension":"mass","defaultUnit":"g"},
  {"id":"xa-xiu","name":"Thịt xá xíu","aliases":["xá xíu"],"dimension":"mass","defaultUnit":"g"},
  {"id":"cha-ca","name":"Chả cá","aliases":["chả cá"],"dimension":"mass","defaultUnit":"g"},
  {"id":"trung-cut","name":"Trứng cút","aliases":["trứng cút"],"dimension":"count","defaultUnit":"quả","units":["quả","trái"]},
  {"id":"trung-muoi","name":"Trứng muối","aliases":["trứng muối"],"dimension":"count","defaultUnit":"quả","units":["quả","trái"]},
  {"id":"sot-teriyaki","name":"Sốt teriyaki","aliases":["teriyaki"],"dimension":"volume","defaultUnit":"ml"},
  {"id":"gio-heo","name":"Giò heo","aliases":["giò heo"],"dimension":"mass","defaultUnit":"g"},
  {"id":"thit-nguoi","name":"Thịt nguội","aliases":["thịt nguội"],"dimension":"mass","defaultUnit":"g"},
  {"id":"xiu-mai","name":"Xíu mại","aliases":["xíu mại"],"dimension":"mass","defaultUnit":"g"},
  {"id":"buoi","name":"Bưởi","aliases":["bưởi"],"dimension":"mass","defaultUnit":"g"},
  {"id":"tieu-xanh","name":"Tiêu xanh","aliases":["tiêu xanh"],"dimension":"mass","defaultUnit":"g"},
  {"id":"bot-gao","name":"Bột gạo","aliases":["bột gạo"],"dimension":"mass","defaultUnit":"g"},
  {"id":"dau-phu-chien","name":"Đậu hũ chiên","aliases":[],"dimension":"mass","defaultUnit":"g"},
  {"id":"cu-cai","name":"Củ cải","aliases":["củ cải"],"dimension":"mass","defaultUnit":"g"},
  {"id":"rau-cu","name":"Rau củ theo mùa","aliases":["rau củ"],"dimension":"mass","defaultUnit":"g"},
  {"id":"banh-quy","name":"Bánh quy","aliases":[],"dimension":"mass","defaultUnit":"g"},
  {"id":"dau-hu-ky","name":"Tàu hũ","aliases":["tàu hũ"],"dimension":"mass","defaultUnit":"g"},
  {"id":"bun-gao","name":"Bún gạo khô","aliases":[],"dimension":"mass","defaultUnit":"g"}
];

EXTRA2.push({ id: 'gao-lut', name: 'Gạo lứt', aliases: ['gạo lứt'], dimension: 'mass', defaultUnit: 'g' });

const SYNONYMS = {
  trung: 'trung-vit', gao: 'gao-tam', hanh: 'hanh-tim', toi: 'toi-bam', 'thit-lon': 'thit-heo',
  bun: 'bun-tuoi', pho: 'banh-pho', 'dau-phu': 'dau-hu', 'ca-chua-bi': 'ca-chua', tom: 'tom-tuoi',
  nam: 'nam-huong', 'ca-hoi': 'ca-phi-le', xoai: 'xoai-xanh'
};

function load() {
  const items = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'ingredients.json'), 'utf8'));
  const units = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'units.json'), 'utf8'));
  const byId = new Map();
  for (const it of items.concat(EXTRA, EXTRA2)) if (!byId.has(it.id)) byId.set(it.id, it);
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
