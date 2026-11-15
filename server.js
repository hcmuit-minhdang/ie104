'use strict';
// NomNom — điểm vào: node server.js [--port=3000] [--db=đường/dẫn/db.json]
const { createApp } = require('./server/lib/app');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const m = /^--(port|db|uploads|public|host)(?:=(.*))?$/.exec(argv[i]);
    if (!m) continue;
    out[m[1]] = m[2] !== undefined ? m[2] : argv[++i];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const opts = {};
  if (args.port !== undefined) opts.port = Number(args.port);
  if (args.host) opts.host = args.host;
  if (args.db) opts.dbFile = args.db;
  if (args.uploads) opts.uploadsDir = args.uploads;
  if (args.public) opts.publicDir = args.public;
  const inst = createApp(opts);
  const port = await inst.listen();
  console.log('NomNom đang chạy tại http://localhost:' + port);
  console.log('CSDL: ' + inst.cfg.dbFile);
  const stop = () => { try { inst.store.flush(); } catch (e) { /* ignore */ } process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  process.on('exit', () => { try { inst.store.flush(); } catch (e) { /* ignore */ } });
  process.on('uncaughtException', (e) => console.error('uncaughtException:', e));
  process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));
}

if (require.main === module) {
  main().catch((e) => { console.error('Không khởi động được server:', e.message); process.exit(1); });
}
module.exports = { createApp };
