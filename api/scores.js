// Shared leaderboard for REZI. Runs as a Vercel Serverless Function.
// Storage: Upstash Redis via its REST API (free tier). Set these two env vars in Vercel:
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
// (Adding the Upstash integration from the Vercel Marketplace sets them for you.)
// If they are missing, the function answers 503 and the game falls back to the screen's own storage.

const KEY = 'rezi:scores:v1';
const MAX = 500;

async function redis(cmd) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('no-store');
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  const j = await r.json();
  return j.result;
}

async function readAll() {
  const raw = await redis(['GET', KEY]);
  return raw ? JSON.parse(raw) : [];
}

function clean(e) {
  const name = String(e.name || 'A Microbe Madness guest').slice(0, 28).replace(/[<>]/g, '');
  const pledges = Array.isArray(e.pledges) ? e.pledges.slice(0, 8).map(p => String(p).slice(0, 80).replace(/[<>]/g, '')) : [];
  const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));
  return {
    id: String(e.id || 'p' + Date.now()).slice(0, 40),
    name, pledges,
    score: num(e.score, 0, 200),
    pwr: num(e.pwr, 0, 100),
    stage: String(e.stage || '').slice(0, 12),
    good: num(e.good, 0, 7),
    streak: num(e.streak, 0, 7),
    ts: Date.now(),
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const entries = await readAll();
      return res.status(200).json({ entries });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (!body.pledges || !body.pledges.length) return res.status(400).json({ error: 'pledge required' });
      const entries = await readAll();
      entries.push(clean(body));
      entries.sort((a, b) => b.score - a.score || a.ts - b.ts);
      const trimmed = entries.slice(0, MAX);
      await redis(['SET', KEY, JSON.stringify(trimmed)]);
      return res.status(200).json({ entries: trimmed });
    }
    if (req.method === 'DELETE') {
      // Reset the board between sessions: curl -X DELETE -H "X-Admin-Key: $ADMIN_KEY" https://your-site/api/scores
      if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
      await redis(['DEL', KEY]);
      return res.status(200).json({ entries: [] });
    }
    return res.status(405).json({ error: 'method' });
  } catch (err) {
    if (String(err.message) === 'no-store') return res.status(503).json({ error: 'leaderboard store not configured' });
    return res.status(500).json({ error: 'server' });
  }
};
