'use strict';
const crypto = require('crypto');
const KEYLEN = 64;
function scrypt(pw, salt) {
  return new Promise((resolve, reject) => crypto.scrypt(pw, salt, KEYLEN, (e, k) => (e ? reject(e) : resolve(k))));
}
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(pw), salt);
  return 's1$' + salt.toString('hex') + '$' + key.toString('hex');
}
function hashPasswordSync(pw) {
  const salt = crypto.randomBytes(16);
  return 's1$' + salt.toString('hex') + '$' + crypto.scryptSync(String(pw), salt, KEYLEN).toString('hex');
}
async function verifyPassword(pw, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 's1') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const key = await scrypt(String(pw), salt);
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}
let dummy = null;
async function fakeVerify(pw) { // chống dò tài khoản qua thời gian phản hồi
  if (!dummy) dummy = hashPasswordSync('nomnom-dummy');
  await verifyPassword(pw, dummy);
}
module.exports = { hashPassword, hashPasswordSync, verifyPassword, fakeVerify };
