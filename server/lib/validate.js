'use strict';
const { HttpError } = require('./http');

const USERNAME_RE = /^[A-Za-z0-9_.]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(v) { return typeof v === 'string' ? v.trim() : ''; }

function checkUsername(v) {
  const s = str(v);
  if (!USERNAME_RE.test(s)) throw new HttpError(400, 'Tên đăng nhập gồm 3–24 ký tự: chữ cái, số, dấu chấm hoặc gạch dưới', 'username');
  return s;
}
function checkEmail(v) {
  const s = str(v).toLowerCase();
  if (s.length > 120 || !EMAIL_RE.test(s)) throw new HttpError(400, 'Email không hợp lệ', 'email');
  return s;
}
function checkPassword(v, field) {
  if (typeof v !== 'string' || v.length < 6) throw new HttpError(400, 'Mật khẩu phải có ít nhất 6 ký tự', field || 'password');
  if (v.length > 200) throw new HttpError(400, 'Mật khẩu quá dài', field || 'password');
  return v;
}
function intParam(q, name, def, min, max) {
  const raw = q[name];
  if (raw === undefined || raw === '') return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new HttpError(400, 'Tham số "' + name + '" không hợp lệ', name);
  return Math.min(max, Math.max(min, Math.floor(n)));
}
function numParam(q, name) {
  const raw = q[name];
  if (raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, 'Tham số "' + name + '" không hợp lệ', name);
  return n;
}
function paging(q) {
  return { page: intParam(q, 'page', 1, 1, 100000), limit: intParam(q, 'limit', 12, 1, 50) };
}
function paginate(list, q) {
  const { page, limit } = paging(q);
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  return { slice: list.slice((page - 1) * limit, page * limit), total, page, pages };
}
module.exports = { str, checkUsername, checkEmail, checkPassword, intParam, numParam, paging, paginate };
