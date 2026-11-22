const { timingSafeEqual } = require('node:crypto');
const { neon } = require('@neondatabase/serverless');

const DATASET_ID = 'UNTIDAR-RRE100-20261122';
const ID_PATTERN = /^[A-Z0-9_-]{2,32}$/;

function send(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

module.exports = async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PUT');
    return send(res, 405, { error: 'Method tidak didukung.' });
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const dataset = url.searchParams.get('dataset');
  const rater = (url.searchParams.get('rater') || '').toUpperCase();
  if (dataset !== DATASET_ID || !ID_PATTERN.test(rater)) {
    return send(res, 400, { error: 'Dataset atau ID rater tidak valid.' });
  }

  let raterTokens;
  try {
    raterTokens = JSON.parse(process.env.RATER_TOKENS || '{}');
  } catch {
    return send(res, 500, { error: 'Konfigurasi RATER_TOKENS bukan JSON yang valid.' });
  }
  const supplied = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const expected = raterTokens[rater];
  if (typeof expected !== 'string' || expected.length < 24 || !safeEqual(supplied, expected)) {
    return send(res, 401, { error: 'ID rater atau token akses salah.' });
  }

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    return send(res, 503, { error: 'Database belum terhubung. Atur POSTGRES_URL atau DATABASE_URL di Vercel.' });
  }

  try {
    const sql = neon(connectionString);
    await sql`CREATE TABLE IF NOT EXISTS rre100_annotations (
      dataset_id TEXT NOT NULL,
      rater_id TEXT NOT NULL,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (dataset_id, rater_id)
    )`;

    const raterOrder = Object.keys(raterTokens).map((id) => id.toUpperCase());
    const raterIndex = raterOrder.indexOf(rater);
    for (const priorRater of raterOrder.slice(0, raterIndex)) {
      const priorRows = await sql`SELECT state FROM rre100_annotations
        WHERE dataset_id = ${dataset} AND rater_id = ${priorRater} LIMIT 1`;
      const priorState = priorRows[0]?.state;
      const pass1Complete = priorState?.locked === true &&
        Array.from({ length: 100 }, (_, i) => `RRE-${String(i + 1).padStart(3, '0')}`)
          .every((id) => /^[1-5]$/.test(String(priorState.answers?.[id]?.skor_keterbacaan_1_5 || '')));
      if (!pass1Complete) {
        return send(res, 403, { error: `Sesi ${priorRater} harus menyelesaikan dan mengunci Pass 1 sebelum rater ini dapat masuk.` });
      }
    }

    if (req.method === 'GET') {
      const rows = await sql`SELECT state, updated_at FROM rre100_annotations
        WHERE dataset_id = ${dataset} AND rater_id = ${rater} LIMIT 1`;
      return send(res, 200, { state: rows[0]?.state || null, updated_at: rows[0]?.updated_at || null });
    }

    const state = req.body?.state;
    if (!state || state.dataset_id !== DATASET_ID || !state.answers || typeof state.answers !== 'object' || Array.isArray(state.answers) || !state.audits || typeof state.audits !== 'object' || Array.isArray(state.audits)) {
      return send(res, 400, { error: 'Format state anotasi tidak valid.' });
    }
    if (JSON.stringify(state).length > 400_000) {
      return send(res, 413, { error: 'Ukuran state anotasi terlalu besar.' });
    }

    const rows = await sql`INSERT INTO rre100_annotations (dataset_id, rater_id, state, updated_at)
      VALUES (${dataset}, ${rater}, ${JSON.stringify(state)}::jsonb, NOW())
      ON CONFLICT (dataset_id, rater_id)
      DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
      RETURNING updated_at`;
    return send(res, 200, { ok: true, updated_at: rows[0]?.updated_at || null });
  } catch (error) {
    console.error('RRE100 annotation persistence error:', error);
    return send(res, 500, { error: 'Gagal membaca atau menyimpan database.' });
  }
};
