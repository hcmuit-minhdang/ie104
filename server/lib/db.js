'use strict';
const fs = require('fs');
const path = require('path');

class Store {
  constructor(file) {
    this.file = file;
    this.data = null;
    this.timer = null;
  }
  load() {
    let raw = null;
    try { raw = fs.readFileSync(this.file, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (raw != null) {
      try { this.data = JSON.parse(raw); } catch (e) {
        try { fs.renameSync(this.file, this.file + '.corrupt-' + Date.now()); } catch (e2) { /* ignore */ }
        this.data = null;
      }
    }
    return this.data;
  }
  set(data) { this.data = data; }
  _write() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    let err;
    for (let i = 0; i < 5; i++) {
      try { fs.renameSync(tmp, this.file); return; } catch (e) { err = e; }
    }
    try { fs.copyFileSync(tmp, this.file); fs.unlinkSync(tmp); } catch (e) { throw err; }
  }
  // Ghi ngay (đồng bộ, nguyên tử: tmp + rename).
  save() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this._write();
  }
  // Ghi trễ (gộp) cho thay đổi không quan trọng (lịch sử xem).
  saveSoon() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; try { this._write(); } catch (e) { console.error('Ghi DB lỗi:', e.message); } }, 250);
    if (this.timer.unref) this.timer.unref();
  }
  flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; try { this._write(); } catch (e) { console.error('Ghi DB lỗi:', e.message); } }
  }
}
module.exports = { Store };
