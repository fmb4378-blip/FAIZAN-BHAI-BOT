/* CLI test: node SY/S7/test.js <session> <payload> <jid> [rounds] */
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const {
  default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers
} = require('@whiskeysockets/baileys');

const payloads = {};
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'test.js')) {
  Object.assign(payloads, require(path.join(__dirname, f)));
}

(async () => {
  const [name, payload, target, rounds] = process.argv.slice(2);
  if (!name || !payload || !target) {
    console.log('usage: node test.js <session> <payload> <jid> [rounds]');
    process.exit(1);
  }
  const dir = path.join(__dirname, '..', '..', 'Love', 'auth', name);
  const { state } = await useMultiFileAuthState(dir);
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Desktop'),
    markOnlineOnConnect: false
  });
  sock.ev.on('connection.update', async (u) => {
    if (u.connection === 'open') {
      console.log(`connected — running ${payload} → ${target}`);
      try {
        await payloads[payload](sock, target, { rounds: rounds ? parseInt(rounds) : undefined });
        console.log('done ✅');
        process.exit(0);
      } catch (e) {
        console.error('error ❌', e.message);
        process.exit(1);
      }
    }
  });
  setTimeout(() => { console.log('timeout'); process.exit(1); }, 120000);
})();
