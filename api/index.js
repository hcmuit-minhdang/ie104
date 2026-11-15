'use strict';
// Điểm vào cho Vercel (serverless): mọi /api/* và /uploads/* đi qua hàm này, file tĩnh do CDN của Vercel phục vụ từ public/.
// Lưu ý: hệ thống file của Vercel chỉ ghi được ở /tmp, nên CSDL JSON và ảnh tải lên nằm ở /tmp
// (tạm thời, mất khi hàm bị thu hồi). Muốn lưu bền vững cần chuyển sang CSDL ngoài.
const os = require('os');
const path = require('path');
const { createApp } = require('../server/lib/app');

let inst = null;
module.exports = (req, res) => {
  if (!inst) {
    const tmp = os.tmpdir();
    inst = createApp({
      dbFile: path.join(tmp, 'nomnom-db.json'),
      uploadsDir: path.join(tmp, 'nomnom-uploads'),
      publicDir: path.join(__dirname, '..', 'public'),
      quiet: true
    });
  }
  inst.server.emit('request', req, res);
};
