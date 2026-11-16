'use strict';
// Sinh nguyên liệu + các bước nấu hợp lý, xác định (deterministic) từ TÊN MÓN + tag, bằng luật từ khóa.
const { catalog } = require('./catalog');
const { hash32 } = require('./text');

const w = (s) => new RegExp('(^|\\s)(?:' + s + ')(?=\\s|$)');
const ANIMAL = new Set(['thit-bo', 'thit-ga', 'thit-heo', 'suon-heo', 'ba-chi', 'xa-xiu', 'xiu-mai', 'gio-heo', 'thit-nguoi', 'cha-lua', 'lap-xuong', 'ca-phi-le', 'ca-hoi', 'ca-loc', 'cha-ca', 'tom-tuoi', 'muc', 'cua', 'ngheu', 'tom-kho', 'trung-cut', 'xuong-ong']);

// [regex, [[id, qty], ...]]  — nhóm "chính" (đạm, rau củ, tinh bột, trái cây)
const MAIN_RULES = [
  [w('ức gà'), [['thit-ga', 300]]], [w('cánh gà'), [['thit-ga', 500]]], [w('gà ác'), [['thit-ga', 500]]],
  [w('gà(?! ác)'), [['thit-ga', 400]], (t, got) => !got.has('thit-ga')],
  [w('bắp bò|bò'), [['thit-bo', 300]]],
  [w('sườn(?: non)?'), [['suon-heo', 400]]], [w('ba chỉ|ba rọi'), [['ba-chi', 400]]], [w('xá xíu'), [['xa-xiu', 200]]],
  [w('xíu mại'), [['xiu-mai', 200]]], [w('giò heo'), [['gio-heo', 300]]], [w('thịt nguội'), [['thit-nguoi', 150], ['cha-lua', 100]]],
  [w('chả lụa'), [['cha-lua', 120]], (t, got) => !got.has('cha-lua')], [w('lạp xưởng'), [['lap-xuong', 120]]],
  [w('thịt heo|thịt nướng|thịt kho|thịt tàu|mọc|nem nướng|thịt|chả lá lốt'), [['thit-heo', 300]], (t, got) => !got.has('suon-heo') && !got.has('ba-chi') && !got.has('xa-xiu') && !got.has('thit-nguoi') && !got.has('gio-heo') && !got.has('thit-heo')],
  [w('cá hồi'), [['ca-hoi', 300]]], [w('cá lóc'), [['ca-loc', 400]]], [w('chả cá'), [['cha-ca', 300]]],
  [w('cá(?: rô)?'), [['ca-phi-le', 400]], (t, got) => !got.has('ca-hoi') && !got.has('ca-loc') && !got.has('cha-ca')],
  [w('tôm'), [['tom-tuoi', 250]]], [w('mực'), [['muc', 300]]], [w('cua(?: đồng| bể)?'), [['cua', 200]]], [w('nghêu'), [['ngheu', 500]]],
  [w('hải sản'), [['tom-tuoi', 150], ['muc', 150]], (t, got) => !got.has('tom-tuoi') && !got.has('muc')],
  [w('flan|trứng sữa'), [['trung-vit', 4], ['sua-tuoi', 400]]], [w('trứng muối'), [['trung-muoi', 2]]], [w('trứng cút'), [['trung-cut', 6]]], [w('trứng vịt'), [['trung-vit', 4]]],
  [w('trứng(?! muối| cút| vịt| sữa)|ốp'), [['trung-vit', 2]], (t, got) => !got.has('trung-vit')],
  [w('đậu hũ non|đậu hũ|đậu phụ|tàu hũ'), [['dau-hu', 250]]],
  [w('nấm kim châm'), [['nam-kim-cham', 120]]], [w('nấm đông cô'), [['nam-dong-co', 100]]], [w('nấm bào ngư|nấm đùi gà'), [['nam-bao-ngu', 250]]],
  [w('nấm hương'), [['nam-huong', 50]]], [w('nấm mèo'), [['nam-meo', 30]]], [w('nấm tuyết'), [['nam-tuyet', 30]]],
  [w('nấm'), [['nam-huong', 150]], (t, got) => !['nam-kim-cham', 'nam-dong-co', 'nam-bao-ngu', 'nam-huong', 'nam-meo', 'nam-tuyet'].some((x) => got.has(x))],
  [w('cà chua'), [['ca-chua', 2]]], [w('cà rốt'), [['ca-rot', 1]]], [w('khoai tây'), [['khoai-tay', 2]]], [w('khoai lang'), [['khoai-lang', 2]]],
  [w('khoai môn'), [['khoai-mon', 1]]], [w('bí đỏ'), [['bi-do', 300]]], [w('cà tím'), [['ca-tim', 2]]], [w('khổ qua'), [['kho-qua', 2]]],
  [w('bắp cải'), [['bap-cai', 200]]], [w('cải thìa'), [['cai-thia', 250]]], [w('bông cải'), [['bong-cai', 300]]], [w('rau cải|cải xanh'), [['rau-cai', 200]]],
  [w('rau muống'), [['rau-muong', 250]]], [w('bông thiên lý'), [['bong-thien-ly', 200]]], [w('cần tây'), [['can-tay', 100]]], [w('hành tây'), [['hanh-tay', 1]]],
  [w('ớt chuông'), [['ot-chuong', 2]]], [w('măng(?: khô| tươi)?'), [['mang', 150]]], [w('ngó sen'), [['ngo-sen', 150]]], [w('củ sen'), [['cu-sen', 250]]],
  [w('ngô non'), [['ngo-non', 100]]], [w('giá'), [['gia-do', 100]]], [w('dưa cải'), [['dua-cai', 100]]], [w('rong biển'), [['rong-bien', 20]]],
  [w('salad'), [['xa-lach', 150]]], [w('rau thơm'), [['rau-thom', 30]]], [w('rau răm'), [['rau-ram', 20]]], [w('rau sống|rau tươi|rau rừng|đồ chua|rau'), [['rau-song', 100]], (t, got) => !got.has('rau-song') && !got.has('rau-cai') && !got.has('rau-muong') && !got.has('bap-cai') && !got.has('cai-thia')],
  [w('xoài'), [['xoai', 1]]], [w('chuối'), [['chuoi', 2]]], [w('dứa'), [['thom', 1]]], [w('táo đỏ'), [['tao-do', 30]]], [w('nhãn'), [['long-nhan', 50]]],
  [w('hạt sen'), [['hat-sen', 100]]], [w('đậu xanh'), [['dau-xanh', 100]]], [w('bưởi'), [['buoi', 100]]], [w('trái cây'), [['trai-cay', 300]]],
  [w('bơ tươi|bơ(?= chuối)|bơ(?= sốt)|bơ$'), [['bo-trai', 1]], (t) => !/sốt bơ/.test(t)],
  [w('bún'), [['bun-tuoi', 250]]], [w('phở'), [['banh-pho', 250]]], [w('miến'), [['mien', 150]]], [w('mì ý'), [['mi-y', 200]]], [w('mì quảng|cao lầu'), [['mi-quang', 250]]],
  [w('hủ tiếu'), [['hu-tieu', 250]]], [w('bánh tráng'), [['banh-trang', 80]]], [w('bánh mì'), [['banh-mi', 2]]],
  [w('cơm chiên'), [['gao-tam', 300], ['trung-vit', 2]]], [w('cơm gạo lứt'), [['gao-lut', 150]]],
  [w('cơm(?! chiên| gạo lứt)'), [['gao-tam', 150]], (t, got) => !got.has('gao-lut')], [w('cháo'), [['gao-tam', 80]]],
  [w('xôi|nếp'), [['gao-nep', 200]]], [w('gyudon'), [['hanh-tay', 1]]], [w('tinh bột|trân châu'), [['tran-chau', 60]], (t) => /trân châu/.test(t)]
];
// nhóm hương vị/đặc trưng
const FLAVOR_RULES = [
  [w('mật ong'), [['mat-ong', 30]]], [w('lá chanh'), [['la-chanh', 10]]], [w('chanh dây'), [['chanh-day', 3]]], [w('chanh'), [['chanh', 1]], (t) => !/chanh dây|lá chanh/.test(t)],
  [w('sả ớt|sả'), [['sa', 3]]], [w('ớt hiểm|ớt|cay'), [['ot', 2]], (t) => !/ớt chuông/.test(t) || /sả ớt|ớt hiểm|muối ớt/.test(t)], [w('gừng'), [['gung', 1]]], [w('tỏi(?: phi)?'), [['toi-bam', 20]]],
  [w('tiêu đen'), [['tieu', 4]]], [w('tiêu xanh'), [['tieu-xanh', 20]]], [w('muối tiêu'), [['muoi', 4], ['tieu', 3]]],
  [w('sốt vang'), [['ruou-vang', 100], ['hoa-hoi', 2], ['que', 1], ['ca-chua', 2]]], [w('cà ri|cari'), [['bot-ca-ri', 20], ['nuoc-cot-dua', 200]]], [w('sa tế'), [['sa-te', 20]]],
  [w('sốt cà|sốt cà chua|sốt chua ngọt|chua ngọt'), [['ca-chua', 2], ['giam', 20], ['duong-cat', 25]], null],
  [w('canh chua'), [['ca-chua', 2], ['me', 30], ['thom', 1], ['gia-do', 100], ['rau-thom', 20]]], [w('bông điên điển'), [['rau-song', 100]]],
  [w('bún bò'), [['sa', 3], ['mam-tom', 15]]], [w('dương châu'), [['ca-rot', 1], ['tom-tuoi', 100]]],
  [w('dầu hào'), [['dau-hao', 20]]], [w('teriyaki'), [['sot-teriyaki', 60], ['mat-ong', 15]]], [w('mỡ hành'), [['hanh-la', 40], ['dau-an', 30]]],
  [w('muối ớt'), [['muoi', 5], ['ot', 3]]], [w('nghệ'), [['nghe', 10]]], [w('lá lốt'), [['la-lot', 60]]], [w('lá é'), [['la-e', 20]]], [w('thì là'), [['thi-la', 30]]],
  [w('nước mắm|mắm|đậm đà|kho quẹt'), [['nuoc-mam', 30]], (t) => !/mắm tôm/.test(t)], [w('mắm chua ngọt|ngâm mắm'), [['giam', 30], ['duong-cat', 30]]],
  [w('sốt mè|muối mè|mè rang'), [['me-rang', 20], ['nuoc-tuong', 15]]], [w('đậu phộng'), [['dau-phong', 30]]], [w('hạt điều'), [['hat-dieu', 30]]], [w('hạnh nhân'), [['hanh-nhan', 20]]], [w('hạt chia'), [['hat-chia', 10]]],
  [w('nước cốt dừa|cốt dừa|nước cốt'), [['nuoc-cot-dua', 150]]], [w('nước dừa|dừa tươi'), [['nuoc-dua', 250]]], [w('dầu ô liu'), [['dau-o-liu', 20]]],
  [w('kem tươi'), [['kem-tuoi', 50]]], [w('sữa chua'), [['sua-chua', 300]]], [w('đường đen'), [['duong-den', 80]]], [w('lá dứa'), [['la-dua', 20]]], [w('sốt bơ'), [['bo-lat', 20]]],
  [w('dấm'), [['giam', 30]]], [w('xối mỡ'), [['dau-an', 150]]], [w('caramel'), [['duong-cat', 60]]], [w('rau câu'), [['rau-cau', 10]]]
];

const STAPLES_BY = {
  grill: [['toi-bam', 15], ['hanh-tim', 2], ['duong-cat', 10], ['nuoc-mam', 20], ['dau-an', 15]],
  roast: [['muoi', 8], ['ngu-vi-huong', 3], ['gung', 1], ['duong-cat', 10], ['giam', 15]],
  fry: [['bot-chien-gion', 100], ['dau-an', 200], ['muoi', 4], ['toi-bam', 15], ['tieu', 2]],
  stirfry: [['dau-an', 20], ['toi-bam', 15], ['hanh-tim', 2], ['nuoc-mam', 15], ['duong-cat', 5], ['hat-nem', 5]],
  braise: [['nuoc-mam', 30], ['duong-cat', 20], ['hanh-tim', 3], ['toi-bam', 15], ['nuoc-dua', 300], ['tieu', 3]],
  boil: [['gung', 1], ['hanh-tim', 2], ['muoi', 10], ['tieu', 3], ['nuoc-mam', 20]],
  steam: [['gung', 1], ['hanh-la', 30], ['muoi', 5], ['tieu', 2], ['nuoc-tuong', 20]],
  soup: [['nuoc-dung', 1000], ['hanh-la', 30], ['muoi', 5], ['hat-nem', 5], ['tieu', 2]],
  hotpot: [['nuoc-dung', 1500], ['hanh-tim', 3], ['sa', 3], ['hat-nem', 8], ['rau-thom', 40], ['bun-tuoi', 200]],
  porridge: [['nuoc-dung', 1000], ['gung', 1], ['hanh-la', 30], ['tieu', 2], ['nuoc-mam', 15]],
  noodleBroth: [['nuoc-dung', 1200], ['hanh-tim', 2], ['hanh-la', 30], ['rau-thom', 30], ['nuoc-mam', 25], ['hat-nem', 5]],
  noodleDry: [['nuoc-mam', 30], ['duong-cat', 20], ['chanh', 1], ['ot', 1], ['rau-song', 100], ['hanh-la', 20], ['dau-an', 15]],
  salad: [['nuoc-mam', 25], ['duong-cat', 20], ['chanh', 1], ['toi-bam', 10], ['ot', 1], ['dau-phong', 20]],
  roll: [['banh-trang', 80], ['rau-song', 120], ['bun-tuoi', 150], ['nuoc-mam', 30], ['duong-cat', 30], ['toi-bam', 10], ['ot', 1]],
  friedRice: [['dau-an', 30], ['toi-bam', 15], ['hanh-la', 20], ['nuoc-mam', 15], ['hat-nem', 5], ['tieu', 2]],
  ricebowl: [['gao-tam', 150], ['dau-an', 15], ['toi-bam', 15], ['nuoc-tuong', 20], ['duong-cat', 10], ['hanh-la', 20]],
  sandwich: [['banh-mi', 2], ['pa-te', 30], ['dua-leo', 1], ['rau-thom', 20], ['tuong-ot', 15], ['muoi', 2]],
  pasta: [['dau-o-liu', 20], ['hanh-tay', 1], ['toi-bam', 15], ['muoi', 4], ['tieu', 2], ['duong-cat', 5]],
  pan: [['bo-lat', 20], ['toi-bam', 10], ['muoi', 4], ['tieu', 3], ['dau-an', 15]],
  dip: [['giam', 100], ['duong-cat', 30], ['hanh-tay', 1], ['sa', 2], ['rau-song', 150], ['nuoc-mam', 20]],
  pickle: [['giam', 60], ['duong-cat', 50], ['nuoc-mam', 40], ['ot', 2], ['toi-bam', 15], ['ca-rot', 1]],
  che: [['duong-cat', 80], ['muoi', 1], ['nuoc-cot-dua', 100], ['la-dua', 10], ['nuoc-dung', 500]],
  flan: [['trung-vit', 4], ['sua-tuoi', 400], ['duong-cat', 100], ['sua-dac', 50]],
  jelly: [['rau-cau', 10], ['duong-cat', 80], ['nuoc-dua', 300], ['la-dua', 10]],
  cold: [['sua-chua', 200], ['mat-ong', 20], ['hat-chia', 8]],
  blend: [['sua-chua', 100], ['sua-dac', 40], ['duong-cat', 15]],
  xoi: [['nuoc-cot-dua', 150], ['duong-cat', 50], ['muoi', 2], ['me-rang', 10]]
};
const GENERIC = new Set(['nuoc-dung', 'muoi', 'hat-nem', 'tieu', 'dau-an', 'duong-cat', 'nuoc-mam', 'nuoc-tuong', 'giam', 'dau-hao', 'hanh-la', 'rau-thom', 'bot-chien-gion', 'dau-phong', 'me-rang']);
const STARCH = new Set(['gao-tam', 'gao-lut', 'gao-nep', 'bun-tuoi', 'banh-pho', 'mien', 'mi-y', 'mi-quang', 'hu-tieu', 'banh-mi', 'banh-trang']);
const FLAVORISH = new Set(['mat-ong', 'la-chanh', 'chanh-day', 'chanh', 'sa', 'ot', 'gung', 'toi-bam', 'tieu', 'tieu-xanh', 'ruou-vang', 'bot-ca-ri', 'sa-te', 'me', 'dau-hao', 'sot-teriyaki', 'nghe', 'la-lot', 'la-e', 'thi-la', 'nuoc-cot-dua', 'nuoc-dua', 'dau-o-liu', 'kem-tuoi', 'duong-den', 'la-dua', 'bo-lat', 'me-rang', 'dau-phong', 'hat-dieu', 'hanh-nhan', 'hat-chia', 'sua-chua', 'mam-tom']);
const FILLERS = { sweet: ['duong-cat', 'muoi', 'nuoc-cot-dua', 'sua-tuoi', 'la-dua', 'mat-ong'], savory: ['muoi', 'hat-nem', 'hanh-tim', 'toi-bam', 'dau-an', 'tieu', 'duong-cat', 'nuoc-mam'] };

const VERBS = [
  ['pan', /bít tết|áp chảo|(^|\s)né(\s|$)|chảo/], ['roast', /(^|\s)quay(\s|$)/], ['grill', /nướng/], ['fry', /chiên|rán|xối mỡ|chả giò/],
  ['stirfry', /xào|lúc lắc|japchae/], ['braise', /(^|\s)(kho|rim|hầm|sốt|nấu)(\s|$)|cà ri|kho tộ/], ['boil', /luộc/], ['steam', /hấp/], ['dip', /nhúng/], ['pickle', /ngâm/]
];

function methodOf(t, tags) {
  if (/^chè|(^|\s)chè(\s|$)|tàu hũ trân châu/.test(t)) return 'che';
  if (/flan/.test(t)) return 'flan';
  if (/rau câu/.test(t)) return 'jelly';
  if (/sinh tố/.test(t)) return 'blend';
  if (/sữa chua hy lạp|salad trái cây/.test(t)) return 'cold';
  if (/^xôi|chuối nếp nướng/.test(t)) return 'xoi';
  if (/^cháo/.test(t)) return 'porridge';
  if (/^phở cuốn|gỏi cuốn/.test(t)) return 'roll';
  if (/(^|\s)lẩu(\s|$)/.test(t)) return 'hotpot';
  if (/^(canh|súp)/.test(t)) return 'soup';
  if (/^cơm chiên/.test(t)) return 'friedRice';
  if (/^miến.*(xào|japchae)|japchae/.test(t)) return 'stirfry';
  if (/^mì ý/.test(t)) return 'pasta';
  if (/^(bún|phở|mì|miến|hủ tiếu|cao lầu|bánh canh)/.test(t)) return /nước|hầm|riêu|thang|bò giò|phở bò|huế|mọc|cá rô|mắm|nam vang|cua/.test(t) && !/khô|trộn|thịt nướng|quảng|cao lầu|chả giò/.test(t) ? 'noodleBroth' : 'noodleDry';
  if (/^(gỏi|salad)|(^|\s)trộn(\s|$)/.test(t)) return 'salad';
  if (/cơm tấm|bò lá lốt|bò nướng lá lốt/.test(t)) return 'grill';
  if (/gyudon|teriyaki/.test(t)) return 'braise';
  if (/^bánh mì(?! chảo)/.test(t)) return 'sandwich';
  let best = null, bi = 1e9;
  for (const [m, re] of VERBS) { const x = re.exec(t); if (x && x.index < bi) { bi = x.index; best = m; } }
  if (best) return best;
  if (/^cơm/.test(t)) return 'ricebowl';
  if (/cuốn/.test(t)) return 'roll';
  return 'stirfry';
}

const unitOf = (id) => { const it = catalog.byId.get(id); return it ? it.defaultUnit : 'g'; };
const nameOf = (id) => { const it = catalog.byId.get(id); return it ? it.name : id; };
const low = (s) => s.charAt(0).toLowerCase() + s.slice(1);

function pickRules(t, rules, got, out, vegan) {
  for (const [re, items, cond] of rules) {
    if (cond === null) { if (!re.test(t)) continue; }
    else { if (!re.test(t)) continue; if (cond && !cond(t, got)) continue; }
    for (const [id, qty] of items) {
      if (vegan && ANIMAL.has(id)) continue;
      if (got.has(id)) continue;
      got.add(id); out.push({ id, qty });
    }
  }
}

function generate(name, tags, time, key) {
  const t = String(name).normalize('NFC').toLowerCase();
  const tagSet = new Set((tags || []).map((x) => String(x).normalize('NFC').toLowerCase()));
  const vegan = /chay/.test(t) || tagSet.has('ăn chay');
  const method = methodOf(t, tagSet);
  const dessert = ['che', 'flan', 'jelly', 'cold', 'blend', 'xoi'].includes(method) || tagSet.has('tráng miệng');
  const got = new Set(); const main = []; const flav = [];
  pickRules(t, MAIN_RULES, got, main, vegan);
  // tag dự phòng khi tên không nói rõ
  if (!main.length) {
    if (tagSet.has('thịt bò')) main.push({ id: 'thit-bo', qty: 300 });
    else if (tagSet.has('thịt gà')) main.push({ id: 'thit-ga', qty: 400 });
    else if (tagSet.has('thịt heo')) main.push({ id: 'thit-heo', qty: 300 });
    else if (tagSet.has('hải sản')) main.push({ id: 'tom-tuoi', qty: 250 });
    else if (!dessert) main.push({ id: 'rau-cai', qty: 250 });
    if (main[0]) got.add(main[0].id);
  }
  pickRules(t, FLAVOR_RULES, got, flav, vegan);
  const items = [];
  const seen = new Set();
  const add = (id, qty) => {
    if (seen.has(id) || items.length >= 10) return; seen.add(id);
    const it = catalog.byId.get(id);
    if (it && it.dimension === 'count' && qty > 10) qty = id === 'hanh-la' ? 1 : 2;
    items.push({ ingredientId: id, qty, unit: unitOf(id) });
  };
  main.forEach((m) => add(m.id, m.qty));
  flav.forEach((m) => add(m.id, m.qty));
  const staples = STAPLES_BY[method] || STAPLES_BY.stirfry;
  for (const [id, q] of staples) { if (items.length >= 8) break; if (!(vegan && ANIMAL.has(id))) add(id, q); }
  for (const id of FILLERS[dessert ? 'sweet' : 'savory']) { if (items.length >= 6) break; add(id, qtyDefault(id)); }
  // nước chấm/đồ ăn kèm khi nướng/chiên
  const mainIds = main.map((m) => m.id);
  const keyIds = mainIds.slice(0, 5);
  const mainList = keyIds.slice();
  if (mainList.length < 2) {
    const extra = flav.find((f) => !mainList.includes(f.id) && !GENERIC.has(f.id));
    if (extra) mainList.push(extra.id);
    else { const x = items.find((i) => !mainList.includes(i.ingredientId) && !GENERIC.has(i.ingredientId)); mainList.push(x ? x.ingredientId : 'hanh-tim'); }
  }

  const names = (ids) => ids.map((id) => low(nameOf(id)));
  const protIds = mainIds.filter((id) => ANIMAL.has(id) || ['dau-hu', 'nam-huong', 'nam-kim-cham', 'nam-dong-co', 'nam-bao-ngu', 'nam-meo', 'nam-tuyet'].includes(id));
  const P = names(protIds.length ? protIds : mainIds.slice(0, 1)).slice(0, 2).join(' và ');
  const nonStarch = mainIds.filter((id) => !STARCH.has(id));
  const K = names(nonStarch.length ? nonStarch : mainIds).slice(0, 3).join(', ');
  const F = names(flav.map((f) => f.id).filter((id) => FLAVORISH.has(id))).slice(0, 3).join(', ');
  const has = (id) => seen.has(id);
  const prep = Math.max(5, Math.round(time * 0.3));
  const cook = Math.max(5, time - prep);
  const S = buildSteps(method, { name, t, P, K, F, has, cook, prep, vegan, stuffed: /nhồi/.test(t), ricey: /^cơm/.test(t) && method !== 'friedRice' && method !== 'ricebowl', protein: protIds.length > 0, items, mainIds });
  const phr = { grill: 'nướng', roast: 'quay', fry: 'chiên giòn', stirfry: 'xào', braise: 'kho/hầm đậm đà', boil: 'luộc thanh đạm', steam: 'hấp', soup: 'nấu canh', hotpot: 'lẩu', porridge: 'cháo', noodleBroth: 'nước dùng', noodleDry: 'trộn/khô', salad: 'trộn tươi mát', roll: 'cuốn', friedRice: 'cơm chiên', pasta: 'mì ý', ricebowl: 'ăn cùng cơm', sandwich: 'bánh mì', pan: 'áp chảo', dip: 'nhúng', pickle: 'ngâm chua ngọt', che: 'chè ngọt', flan: 'tráng miệng mềm mịn', jelly: 'tráng miệng mát lạnh', cold: 'tráng miệng mát lạnh', blend: 'thức uống', xoi: 'xôi ngọt' }[method];
  const description = name + ' là món ' + phr + ' làm từ ' + K + (F ? ', nêm vị đặc trưng với ' + F : '') + '. Công thức đã được chia sẵn nguyên liệu và các bước làm, mất khoảng ' + time + ' phút.';
  return { ingredients: items, main: mainList, steps: S.map((s) => ({ text: s[1], images: [] })), quickSteps: S.map((s) => s[0]), method, description, summary: 'Cách làm ' + low(name) + ' trong khoảng ' + time + ' phút.' };
}

function qtyDefault(id) { const it = catalog.byId.get(id); if (it && it.dimension === 'count') return 1; if (it && it.dimension === 'volume') return 20; return id === 'muoi' ? 3 : 10; }

function buildSteps(m, c) {
  const { name, P, K, F, cook, prep } = c;
  const L = (q, ...lines) => [q, lines.filter(Boolean)];
  const wash = L('Sơ chế: Rửa sạch ' + K + ', để ráo, cắt miếng vừa ăn.', 'Rửa sạch ' + K + ', để ráo nước.', c.has('toi-bam') ? 'Bóc tỏi, băm nhuyễn; hành tím bóc vỏ, thái lát mỏng.' : 'Cắt thành miếng vừa ăn.');
  const rice = L('Nấu cơm: Vo gạo, nấu cơm để dọn cùng món.', 'Vo gạo 2–3 lần, nấu chín bằng nồi cơm điện hoặc nồi thường.');
  const withRice = (arr) => (c.ricey ? [arr[0], rice, ...arr.slice(1)] : arr);
  const plate = (extra) => L('Trình bày: Bày ' + name.toLowerCase() + ' ra đĩa' + (c.ricey ? ' cùng cơm nóng' : '') + '.', 'Bày ' + low(name) + ' ra đĩa' + (c.ricey ? ', dọn cùng cơm nóng' : '') + '.', extra || 'Ăn nóng để giữ trọn hương vị.');
  switch (m) {
    case 'grill': case 'roast': {
      const v = m === 'roast' ? 'quay' : 'nướng';
      return withRice([
        wash,
        L('Ướp: Ướp ' + P + ' với ' + (F || 'gia vị') + ', tỏi, nước mắm cho thấm.', 'Cho ' + P + ' vào tô, thêm ' + (F ? F + ', ' : '') + 'một ít muối, đường và tiêu.', 'Trộn đều, ướp ít nhất 30 phút (để tủ lạnh nếu ướp lâu hơn).'),
        L('Làm nóng lò: Làm nóng lò ở 200°C hoặc nhóm bếp than hoa.', 'Làm nóng lò 200°C 10 phút (hoặc đợi than hồng đều).', 'Quét một lớp dầu mỏng lên vỉ để không dính.'),
        L((m === 'roast' ? 'Quay' : 'Nướng') + ': ' + v + ' ' + P + ' khoảng ' + cook + ' phút, trở mặt giữa chừng.', 'Xếp ' + P + ' lên vỉ, ' + v + ' khoảng ' + cook + ' phút.', 'Trở mặt đều tay' + (c.has('mat-ong') ? ', phết thêm mật ong ở những phút cuối cho bóng đẹp.' : ', phết thêm phần nước ướp để thịt không bị khô.')),
        L('Hoàn thiện: Để món nghỉ 5 phút rồi cắt miếng.', 'Để ' + low(name) + ' nghỉ 5 phút cho thịt giữ nước rồi cắt miếng vừa ăn.'),
        plate('Dùng kèm rau sống, đồ chua hoặc nước chấm tùy thích.')
      ]);
    }
    case 'fry':
      return withRice([
        wash,
        L('Ướp: Ướp ' + P + ' với ' + (F || 'gia vị') + ', muối, tiêu khoảng 20 phút.', 'Trộn ' + P + ' với ' + (F ? F + ', ' : '') + 'muối, tiêu.', 'Ướp khoảng 20 phút cho thấm.'),
        L('Tạo lớp áo: Lăn ' + P + ' qua bột chiên giòn (hoặc bột và trứng).', 'Lăn ' + P + ' qua bột, giũ bỏ bột thừa để lớp áo mỏng, đều.'),
        L('Chiên: Chiên ngập dầu nóng khoảng ' + cook + ' phút đến vàng giòn.', 'Đun dầu ở khoảng 170°C, thả từng ít một vào chiên ' + Math.max(5, cook) + ' phút cho vàng giòn.', 'Vớt ra giấy thấm dầu.'),
        L('Nêm nếm: Rắc muối tiêu hoặc rưới sốt đi kèm.', 'Pha nước chấm/sốt đi kèm cho vừa ăn.'),
        plate('Dùng nóng ngay để lớp vỏ còn giòn.')
      ]);
    case 'pan':
      return withRice([
        L('Sơ chế: Để ' + P + ' ra ngoài tủ lạnh 15 phút, thấm khô.', 'Để ' + P + ' ở nhiệt độ phòng khoảng 15 phút, thấm thật khô bằng khăn giấy.', 'Chuẩn bị ' + K + ' rửa sạch, cắt miếng vừa ăn.'),
        L('Ướp: Ướp ' + P + ' với muối, tiêu' + (F ? ' và ' + F : '') + '.', 'Rắc muối, tiêu' + (F ? ', thêm ' + F : '') + ' lên ' + P + ', ướp 10–15 phút.'),
        L('Áp chảo: Đun chảo thật nóng, cho bơ và áp chảo ' + P + ' mỗi mặt 2–4 phút.', 'Đun chảo gang/chống dính thật nóng, cho bơ lạt và dầu ăn.', 'Áp chảo ' + P + ' mỗi mặt 2–4 phút đến độ chín mong muốn, thêm tỏi để dậy mùi.'),
        L('Làm sốt: Dùng chính chảo đó làm sốt' + (F ? ' ' + F : '') + '.', 'Hạ lửa, cho tỏi băm, ' + (F || 'nước màu và gia vị') + ' vào đảo 1–2 phút tạo sốt sánh nhẹ.'),
        plate('Rưới sốt lên trên, dùng kèm ' + (c.has('khoai-tay') ? 'khoai tây' : 'rau củ hoặc bánh mì') + '.')
      ]);
    case 'stirfry':
      return withRice([
        wash,
        L('Ướp: Ướp ' + P + ' với ' + (F || 'chút nước mắm, đường, tiêu') + ' khoảng 15 phút.', 'Thái ' + P + ' mỏng/vừa ăn, ướp với ' + (F || 'nước mắm, đường, tiêu') + ' khoảng 15 phút.'),
        L('Phi thơm: Phi tỏi với dầu nóng cho vàng thơm.', 'Đun nóng chảo với dầu ăn, phi thơm tỏi và hành.'),
        L('Xào: Cho ' + P + ' vào xào lửa lớn khoảng ' + Math.min(cook, 8) + ' phút.', 'Cho ' + P + ' vào xào lửa lớn, đảo nhanh tay ' + Math.min(cook, 8) + ' phút cho săn lại, tiết ra ít nước.'),
        L('Thêm rau củ: Cho ' + K + ' vào xào tới chín tới.', 'Cho phần rau củ còn lại vào, đảo đều thêm 2–3 phút để giữ độ giòn.'),
        L('Nêm nếm: Nêm lại cho vừa ăn rồi tắt bếp.', 'Nêm nếm gia vị cho vừa ăn, tắt bếp.'),
        plate()
      ]);
    case 'braise':
      return withRice([
        wash,
        L('Ướp: Ướp ' + P + ' với ' + (F || 'nước mắm, đường, hành tỏi') + ' khoảng 30 phút.', 'Trộn ' + P + ' với hành tỏi băm, nước mắm, đường' + (F ? ' và ' + F : '') + ', ướp 30 phút.'),
        L('Thắng đường/xào săn: Phi thơm hành tỏi, xào săn ' + P + '.', 'Phi thơm hành tỏi với dầu, cho ' + P + ' vào xào săn trên lửa lớn để ' + P + ' giữ được vị ngọt.'),
        L('Hầm/kho: Đổ nước (nước dừa) vừa ngập, đun sôi rồi hạ lửa nhỏ.', 'Đổ nước hoặc nước dừa vừa ngập, đun sôi, hớt bọt rồi hạ lửa nhỏ.', 'Kho/hầm khoảng ' + cook + ' phút đến khi mềm, nước sánh lại.'),
        L('Nêm nếm: Thêm ' + (K !== P ? K : 'rau củ') + ' nếu có, nêm lại cho vừa ăn.', 'Cho phần rau củ/nguyên liệu phụ vào nấu thêm 10 phút, nêm lại mặn ngọt.', 'Rắc tiêu, hành lá trước khi tắt bếp.'),
        plate('Dùng nóng với cơm hoặc bánh mì.')
      ]);
    case 'boil':
      return withRice([
        wash,
        L('Chuẩn bị nước luộc: Đun sôi nước với gừng, hành' + (c.has('la-chanh') ? ', lá chanh' : '') + ' và chút muối.', 'Cho nước vào nồi cùng gừng, hành' + (c.has('la-chanh') ? ', lá chanh' : '') + ' và chút muối, đun sôi.'),
        L('Luộc: Thả ' + P + ' vào luộc khoảng ' + cook + ' phút đến chín.', 'Thả ' + P + ' vào, hạ lửa vừa, luộc khoảng ' + cook + ' phút đến khi chín tới (chọc đũa không còn nước hồng).'),
        L('Làm nguội: Vớt ra, ngâm nước đá hoặc để ráo.', 'Vớt ra ngâm nhanh nước đá (nếu cần), để ráo rồi cắt/xé miếng vừa ăn.'),
        L('Pha nước chấm: Pha muối tiêu chanh hoặc nước mắm tỏi ớt.', 'Pha nước chấm: ' + (c.has('muoi') ? 'muối tiêu' : 'nước mắm') + ', tỏi, ớt và chút chanh/đường.'),
        plate('Dùng kèm rau sống và nước chấm.')
      ]);
    case 'steam': {
      const a = [wash];
      if (c.stuffed) a.push(L('Làm nhân: Trộn nhân thịt với hành, tiêu rồi nhồi vào ' + P + '.', 'Trộn nhân (thịt, hành, tiêu, nước mắm) cho dẻo.', 'Nhồi nhân vào phần ruột rồi xếp gọn gàng.'));
      a.push(L('Ướp: Ướp ' + P + ' với ' + (F || 'gừng, hành, nước mắm') + ' khoảng 15 phút.', 'Ướp ' + P + ' với ' + (F || 'gừng, hành, nước mắm') + ' khoảng 15 phút.'));
      a.push(L('Hấp: Xếp vào xửng, hấp lửa lớn ' + cook + ' phút.', 'Đun sôi nước trong nồi hấp, xếp ' + P + ' vào xửng, hấp lửa lớn khoảng ' + cook + ' phút đến chín.'));
      a.push(L('Làm nước chấm/sốt: Pha nước tương, gừng, ớt hoặc phi hành.', 'Pha nước chấm hoặc phi hành, rưới lên món.'));
      a.push(plate('Rắc hành lá, dùng nóng.'));
      return a;
    }
    case 'soup': case 'hotpot': {
      const hp = m === 'hotpot';
      const a = [wash];
      if (c.stuffed) a.push(L('Làm nhân: Trộn nhân rồi nhồi vào ' + P + '.', 'Trộn nhân thịt/đậu hũ với hành, tiêu, nước mắm.', 'Nhồi nhân vào phần ruột, giữ chặt tay.'));
      a.push(L('Nấu nước dùng: Đun sôi nước dùng' + (hp ? ' ở nồi lẩu' : '') + ', thêm hành tím/sả.', 'Cho nước dùng vào nồi, thêm hành tím' + (c.has('sa') ? ', sả đập dập' : '') + ', đun sôi và hớt bọt.'));
      a.push(L('Nấu nguyên liệu: Cho ' + (P || K) + ' vào nấu' + (hp ? ' vừa chín tới' : ' ' + Math.max(8, cook - 5) + ' phút') + '.', 'Cho ' + (P || K) + ' vào nấu trên lửa vừa ' + (hp ? 'vài phút để nước ngọt ra.' : Math.max(8, cook - 5) + ' phút đến khi chín mềm.')));
      a.push(L('Nêm nếm: Nêm muối, hạt nêm cho vừa ăn' + (F ? ', thêm ' + F : '') + '.', 'Nêm muối, hạt nêm vừa ăn' + (F ? ' và ' + F : '') + '.'));
      a.push(hp ? L('Chuẩn bị đồ nhúng: Xếp ' + K + ', rau và bún ra đĩa.', 'Xếp ' + K + ', rau xanh và bún ra đĩa lớn.', 'Pha nước chấm theo khẩu vị.') : L('Thêm rau: Cho phần rau/đậu hũ vào, tắt bếp khi vừa chín.', 'Cho rau, hành lá vào, đun thêm 1–2 phút rồi tắt bếp để rau không bị nhũn.'));
      a.push(L('Thưởng thức: ' + (hp ? 'Nhúng nguyên liệu vào nồi lẩu đang sôi, ăn nóng.' : 'Múc canh ra tô, ăn nóng.'), hp ? 'Đặt nồi lên bếp mini ngay trên bàn để giữ sôi, nhúng từng ít một và ăn nóng.' : 'Múc ra tô, rắc hành ngò và tiêu, ăn nóng.'));
      return a;
    }
    case 'porridge':
      return [
        L('Sơ chế: Vo gạo, ngâm 30 phút; rửa sạch ' + K + '.', 'Vo gạo, ngâm 30 phút cho mau nở.', 'Rửa sạch ' + K + ', cắt/băm nhỏ.'),
        L('Nấu cháo: Nấu gạo với nước dùng khoảng ' + Math.max(25, cook - 10) + ' phút đến khi nhừ.', 'Nấu gạo với nước dùng, khuấy thường xuyên khoảng ' + Math.max(25, cook - 10) + ' phút đến khi hạt gạo nở nhừ.'),
        L('Nấu nguyên liệu: Xào sơ ' + P + ' với hành, tỏi rồi cho vào nồi cháo.', 'Xào sơ ' + P + ' với hành, tỏi rồi cho vào nồi cháo, nấu thêm 10 phút.'),
        L('Nêm nếm: Nêm nước mắm, muối, tiêu cho vừa ăn.', 'Nêm nước mắm, muối, tiêu cho vừa ăn' + (F ? ', thêm ' + F : '') + '.'),
        L('Thưởng thức: Múc cháo ra tô, rắc hành lá, tiêu, ăn nóng.', 'Múc cháo ra tô, rắc hành lá, tiêu, thêm gừng sợi nếu thích.')
      ];
    case 'noodleBroth':
      return [
        wash,
        L('Hầm nước dùng: Hầm xương và ' + P + ' với hành, gừng cho ngọt nước.', 'Cho nước, xương ống và ' + P + ' vào nồi cùng hành tím nướng, gừng; hầm lửa nhỏ khoảng ' + Math.max(20, cook - 10) + ' phút, hớt bọt thường xuyên.'),
        L('Chuẩn bị topping: Luộc/xào ' + P + ' vừa chín.', 'Luộc hoặc xào nhanh ' + P + ' vừa chín, thái miếng hoặc xé nhỏ.'),
        L('Nêm nước dùng: Nêm nước mắm, hạt nêm' + (F ? ', ' + F : '') + ' cho vừa ăn.', 'Nêm nước mắm, hạt nêm' + (F ? ' và ' + F : '') + ', nếm lại cho đậm đà.'),
        L('Chần ' + (c.has('banh-pho') ? 'bánh phở' : c.has('mien') ? 'miến' : 'bún') + ': Trụng ' + (c.has('banh-pho') ? 'bánh phở' : c.has('mien') ? 'miến' : 'bún') + ' qua nước sôi cho nóng.', 'Trụng ' + (c.has('banh-pho') ? 'bánh phở' : c.has('mien') ? 'miến' : 'bún') + ' qua nước sôi, để ráo.'),
        L('Trình bày: Xếp ' + (c.has('banh-pho') ? 'bánh phở' : c.has('mien') ? 'miến' : 'bún') + ', topping vào tô, chan nước dùng nóng.', 'Xếp sợi vào tô, đặt topping lên trên, chan nước dùng thật nóng.', 'Ăn kèm rau thơm, chanh, ớt.')
      ];
    case 'noodleDry':
      return [
        wash,
        L('Làm chín ' + P + ': Nướng/xào/luộc ' + P + ' vừa chín.', 'Ướp ' + P + ' với ' + (F || 'nước mắm, đường, tỏi') + ' 20 phút rồi nướng/xào cho thơm.'),
        L('Chần sợi: Trụng sợi qua nước sôi, để ráo.', 'Trụng sợi (bún/mì/phở) qua nước sôi cho chín, để ráo, tách rời.'),
        L('Pha nước trộn/chấm: Pha nước mắm chua ngọt cay.', 'Pha nước mắm với đường, chanh, tỏi, ớt theo khẩu vị' + (F ? ' và ' + F : '') + '.'),
        L('Trình bày: Cho sợi, rau sống, ' + P + ' vào tô, rưới nước trộn.', 'Xếp sợi, rau sống, ' + P + ' vào tô, rưới nước trộn/ nước chấm lên.', 'Rắc đậu phộng, hành phi (nếu có), trộn đều khi ăn.')
      ];
    case 'salad': {
      const cw = /nướng/.test(c.t) ? 'nướng' : /áp chảo/.test(c.t) ? 'áp chảo' : /chiên/.test(c.t) ? 'chiên' : 'luộc';
      return [
        L('Sơ chế rau: Rửa sạch, để ráo ' + K + '.', 'Rửa sạch, ngâm nước muối loãng rồi để ráo ' + K + '.', 'Thái sợi/miếng vừa ăn.'),
        c.protein ? L('Làm chín ' + P + ': ' + cw[0].toUpperCase() + cw.slice(1) + ' ' + P + ' vừa chín rồi để nguội.', cw[0].toUpperCase() + cw.slice(1) + ' ' + P + ' vừa chín, để nguội rồi ' + (cw === 'luộc' ? 'xé/thái' : 'cắt lát') + ' mỏng.') : L('Chuẩn bị topping: Rang đậu phộng/mè, phi hành.', 'Rang giòn đậu phộng hoặc mè; phi hành tím.'),
        L('Pha nước trộn: Trộn nước mắm, đường, chanh, tỏi, ớt' + (F ? ', ' + F : '') + '.', 'Pha nước trộn: nước mắm, đường, chanh/giấm, tỏi, ớt' + (F ? ' và ' + F : '') + '; khuấy tan đường.'),
        L('Trộn: Trộn ' + K + ' với nước trộn ngay trước khi ăn.', 'Cho ' + K + ' vào âu lớn, rưới nước trộn, trộn nhẹ tay cho thấm.'),
        L('Trình bày: Bày ra đĩa, rắc đậu phộng/mè, rau thơm.', 'Bày ra đĩa, rắc đậu phộng hoặc mè rang và rau thơm.', 'Dùng ngay để rau giữ độ giòn.')
      ];
    }
    case 'roll':
      return [
        wash,
        L('Làm chín ' + P + ': Luộc/nướng ' + P + ' rồi cắt lát mỏng.', 'Luộc hoặc nướng ' + P + ' vừa chín, để nguội và cắt lát mỏng/sợi.'),
        L('Chuẩn bị rau & bún: Trụng bún, xếp rau sống ra đĩa.', 'Trụng sợi bún/bánh phở, để ráo; xếp rau sống, rau thơm ra đĩa.'),
        L('Pha nước chấm: Pha nước mắm/tương chua ngọt cay.', 'Pha nước chấm: nước mắm, đường, chanh, tỏi, ớt; hoặc tương đậu phộng.'),
        L('Cuốn: Nhúng bánh tráng, xếp nhân và cuốn chặt tay.', 'Nhúng nhanh bánh tráng vào nước, trải ra, xếp rau, ' + P + ' và sợi bún lên.', 'Gấp hai mép rồi cuốn chặt tay.'),
        L('Thưởng thức: Dọn cùng nước chấm.', 'Bày cuốn ra đĩa, dọn kèm nước chấm, ăn ngay.')
      ];
    case 'friedRice':
      return [
        L('Sơ chế: Dùng cơm nguội, tơi cơm; ' + 'chuẩn bị ' + K + '.', 'Dùng cơm nguội (nấu từ hôm trước), tơi từng hạt bằng tay.', 'Rửa, thái hạt lựu ' + K + '.'),
        L('Chiên trứng/phi thơm: Phi tỏi, đánh trứng và gạt vào chảo.', 'Phi thơm tỏi với dầu, đập trứng vào đảo tơi.'),
        L('Xào ' + P + ': Xào ' + P + ' và các nguyên liệu phụ cho chín.', 'Cho ' + P + ' và nguyên liệu phụ vào xào lửa lớn khoảng 3–4 phút.'),
        L('Cho cơm: Cho cơm vào đảo đều lửa lớn.', 'Cho cơm vào, dùng sạng ép và đảo liên tục lửa lớn khoảng 5 phút cho hạt cơm săn, khô.'),
        L('Nêm nếm: Nêm hạt nêm, nước mắm, tiêu; rắc hành lá.', 'Nêm hạt nêm, nước mắm' + (F ? ', ' + F : '') + ', tiêu cho vừa ăn; rắc hành lá, đảo thêm 1 phút.'),
        plate()
      ];
    case 'ricebowl':
      return [
        rice,
        wash,
        L('Nấu topping: Nấu ' + P + ' với ' + (F || 'nước tương, đường, hành') + ' đến khi sệt nhẹ.', 'Phi thơm hành tỏi, cho ' + P + ' vào xào săn.', 'Thêm ' + (F || 'nước tương, đường') + ' và chút nước, nấu liu riu ' + Math.min(cook, 12) + ' phút cho thấm.'),
        L('Chuẩn bị đồ ăn kèm: Làm rau/trứng ăn kèm.', 'Chuẩn bị ' + (c.has('trung-vit') ? 'trứng (ốp la hoặc lòng đào)' : 'rau luộc hoặc dưa chua') + ' ăn kèm.'),
        L('Trình bày: Xới cơm ra tô, đặt topping lên trên.', 'Xới cơm nóng ra tô, đặt ' + P + ' và đồ ăn kèm lên, rưới phần nước sốt còn lại.', 'Rắc hành lá/mè, ăn nóng.')
      ];
    case 'sandwich':
      return [
        L('Sơ chế: Chuẩn bị ' + K + ', rau và đồ chua.', 'Rửa, để ráo rau; thái mỏng ' + K + '.', 'Chuẩn bị dưa leo, đồ chua và rau thơm.'),
        L('Làm nhân: Làm chín ' + P + ' và nêm vị.', 'Áp chảo hoặc xào nhanh ' + P + ' với ' + (F || 'chút gia vị') + ' cho thơm.'),
        L('Nướng bánh: Nướng sơ bánh mì cho giòn.', 'Nướng bánh mì ở lò hoặc chảo khoảng 2–3 phút cho vỏ giòn.'),
        L('Phết sốt: Phết pa-tê/bơ, tương ớt vào ruột bánh.', 'Rạch dọc ổ bánh mì, phết pa-tê hoặc bơ, tương ớt.'),
        L('Kẹp nhân: Xếp nhân, rau, dưa leo rồi dùng ngay.', 'Xếp ' + P + ', rau, dưa leo, đồ chua vào bánh, ăn ngay khi còn giòn nóng.')
      ];
    case 'pasta':
      return [
        wash,
        L('Luộc mì: Luộc mì ý với nước sôi và chút muối đến khi al dente.', 'Đun sôi nước với một nhúm muối, luộc mì ý theo hướng dẫn trên bao bì (khoảng 8–10 phút) cho vừa chín tới.', 'Vớt ra, trộn chút dầu ô liu để mì không dính.'),
        L('Xào nền sốt: Phi thơm hành tây, tỏi với dầu ô liu.', 'Đun nóng dầu ô liu, phi thơm tỏi và hành tây băm nhỏ.', 'Cho ' + P + ' vào xào săn trên lửa lớn.'),
        L('Nấu sốt: Cho cà chua vào nấu thành sốt sệt.', 'Cho ' + (c.has('ca-chua') ? 'cà chua băm' : 'sốt cà chua') + ' vào, nêm muối, đường, tiêu; nấu lửa nhỏ ' + Math.max(8, cook - 8) + ' phút đến khi sốt sệt.'),
        L('Trộn mì: Cho mì vào đảo đều với sốt.', 'Cho mì đã luộc vào chảo, đảo đều 1–2 phút cho mì thấm sốt.'),
        L('Trình bày: Bày mì ra đĩa, rắc tiêu.', 'Bày mì ra đĩa, rắc tiêu xay và rau thơm; ăn nóng.')
      ];
    case 'dip':
      return [
        wash,
        L('Chuẩn bị nước nhúng: Đun nước dấm với sả, hành tây, đường.', 'Đun sôi nước với dấm, đường, sả, hành tây thái mỏng; nêm cho vị chua ngọt hài hòa.'),
        L('Thái mỏng: Thái ' + P + ' thật mỏng ngang thớ.', 'Thái ' + P + ' thật mỏng ngang thớ để nhúng nhanh chín.'),
        L('Chuẩn bị rau & nước chấm: Xếp rau sống, bánh tráng; pha mắm nêm/nước chấm.', 'Xếp rau sống, bánh tráng ra đĩa; pha nước chấm.'),
        L('Nhúng & cuốn: Nhúng ' + P + ' vào nồi nước sôi vài giây rồi cuốn.', 'Nhúng ' + P + ' vào nồi nước sôi vài giây đến khi vừa chín, cuốn cùng rau và bánh tráng, chấm nước chấm.')
      ];
    case 'pickle':
      return [
        L('Sơ chế: Luộc ' + P + ' vừa chín, để nguội, thái lát.', 'Luộc ' + P + ' với gừng cho vừa chín, để nguội rồi thái lát mỏng.'),
        L('Pha nước ngâm: Pha nước mắm, giấm, đường, tỏi, ớt.', 'Pha nước ngâm: nước mắm, giấm, đường theo tỉ lệ chua ngọt, thêm tỏi, ớt băm.'),
        L('Ngâm: Cho ' + P + ' và cà rốt vào ngâm ít nhất 1 giờ.', 'Cho ' + P + ' và cà rốt vào hũ, đổ nước ngâm ngập, để ngăn mát ít nhất 1 giờ.'),
        L('Trình bày: Vớt ra đĩa, rắc rau răm.', 'Vớt ra đĩa, rưới ít nước ngâm, rắc rau răm, ăn lạnh.')
      ];
    case 'che':
      return [
        L('Sơ chế: Ngâm/rửa ' + K + ' cho mềm.', 'Ngâm (nếu là hạt) ' + K + ' cho nở, rửa sạch, để ráo.'),
        L('Nấu: Nấu ' + K + ' với nước đến khi mềm.', 'Nấu ' + K + ' với nước lửa nhỏ khoảng ' + Math.max(15, cook - 5) + ' phút đến khi mềm.'),
        L('Nêm ngọt: Thêm đường, chút muối' + (F ? ', ' + F : '') + '.', 'Thêm đường, chút muối' + (F ? ' và ' + F : '') + ', khuấy nhẹ cho tan.'),
        L('Hoàn thiện: Thêm nước cốt dừa/topping.', 'Thêm nước cốt dừa hoặc topping, đun sôi nhẹ rồi tắt bếp.'),
        L('Thưởng thức: Dùng ấm hoặc thêm đá.', 'Múc ra ly/chén, dùng ấm hoặc thêm đá bào cho mát.')
      ];
    case 'flan':
      return [
        L('Làm caramel: Thắng đường với chút nước thành màu hổ phách.', 'Đun đường với chút nước đến khi chuyển màu hổ phách, đổ nhanh vào khuôn.'),
        L('Trộn hỗn hợp: Đánh nhẹ trứng với sữa, đường.', 'Đánh nhẹ trứng với sữa tươi, sữa đặc, đường (không đánh nổi bọt).'),
        L('Lọc: Lọc hỗn hợp qua rây cho mịn.', 'Lọc hỗn hợp qua rây 1–2 lần, đổ vào khuôn.'),
        L('Hấp: Hấp cách thủy lửa nhỏ ' + Math.max(20, cook - 5) + ' phút.', 'Bọc khuôn bằng giấy bạc, hấp cách thủy lửa nhỏ khoảng ' + Math.max(20, cook - 5) + ' phút đến khi đông.'),
        L('Làm lạnh: Để nguội, cho tủ lạnh ít nhất 2 giờ rồi úp ra đĩa.', 'Để nguội, cho vào ngăn mát ít nhất 2 giờ rồi úp ra đĩa.')
      ];
    case 'jelly':
      return [
        L('Hòa bột: Hòa bột rau câu với nước.', 'Hòa bột rau câu với nước lạnh, để 10 phút cho nở.'),
        L('Đun: Đun với đường đến khi tan hoàn toàn.', 'Đun lửa nhỏ, khuấy đều đến khi bột và đường tan hết.'),
        L('Thêm hương vị: Thêm ' + (F || 'nước dừa, lá dứa') + ' và khuấy đều.', 'Thêm ' + (F || 'nước dừa') + ', khuấy đều, tắt bếp.'),
        L('Đổ khuôn: Đổ hỗn hợp vào khuôn/vỏ dừa.', 'Đổ hỗn hợp vào khuôn hoặc vỏ dừa, để nguội ở nhiệt độ phòng.'),
        L('Làm lạnh: Cho vào tủ lạnh 2–3 giờ cho đông.', 'Cho vào ngăn mát 2–3 giờ cho đông hẳn rồi cắt miếng.')
      ];
    case 'cold': case 'blend':
      return [
        L('Sơ chế: Rửa sạch, gọt, cắt nhỏ ' + K + '.', 'Rửa sạch, gọt vỏ (nếu cần) và cắt nhỏ ' + K + '.'),
        m === 'blend' ? L('Xay: Cho ' + K + ' cùng sữa chua/sữa đặc vào máy xay.', 'Cho ' + K + ' cùng sữa, đá và đường vào máy xay đến khi mịn.') : L('Chuẩn bị nền: Cho sữa chua vào ly/tô.', 'Cho sữa chua vào ly hoặc tô, san đều.'),
        L('Nêm ngọt: Thêm mật ong/đường.', 'Thêm mật ong hoặc đường theo khẩu vị' + (F ? ' và ' + F : '') + '.'),
        L('Trình bày: Xếp ' + K + ' và rắc hạt dinh dưỡng.', 'Xếp ' + K + ' lên trên, rắc hạt chia hoặc hạnh nhân.'),
        L('Thưởng thức: Dùng lạnh.', 'Để ngăn mát 15 phút rồi thưởng thức lạnh.')
      ];
    case 'xoi':
      return [
        L('Ngâm nếp: Ngâm gạo nếp 4 giờ hoặc qua đêm.', 'Vo sạch, ngâm gạo nếp ít nhất 4 giờ, để ráo.'),
        L('Hấp xôi: Hấp nếp với chút muối đến chín.', 'Hấp nếp với chút muối và lá dứa khoảng 30 phút đến khi dẻo.'),
        L('Nấu nước cốt dừa: Đun nước cốt dừa với đường, muối.', 'Đun nước cốt dừa với đường và chút muối đến khi sánh nhẹ.'),
        L('Trộn: Trộn xôi nóng với một phần nước cốt dừa.', 'Trộn xôi còn nóng với một phần nước cốt dừa, đậy kín 10 phút cho thấm.'),
        L('Trình bày: Dọn xôi với ' + K + ', rưới nước cốt dừa.', 'Dọn xôi cùng ' + K + ', rưới thêm nước cốt dừa, rắc mè rang.')
      ];
    default: return [wash, plate()];
  }
}

module.exports = { generate, ANIMAL };
