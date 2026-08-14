async function linkflood(sock, targetJid, opts = {}) {
  const total = opts.rounds || 30, ms = 5;
  for (let i = 0; i < total; i++) {
    try {
      await sock.sendMessage(targetJid, {
        text: `https://wa.me/${Date.now() % 100000}?text=${'a'.repeat(200)} ${'b'.repeat(200)}`
      });
    } catch (e) { console.log(`[linkflood] ${i + 1}: ${e.message}`); break; }
    await new Promise(r => setTimeout(r, ms * 1000));
  }
}

module.exports = { linkflood };
