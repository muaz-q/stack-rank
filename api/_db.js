import { neon } from "@neondatabase/serverless";

// Neon's Vercel integration sets DATABASE_URL (older setups use POSTGRES_URL)
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const sql = url ? neon(url) : null;

let ready;
export function ensureSchema() {
  if (!sql) throw new Error("DATABASE_URL is not set: connect a Neon database to this Vercel project, then redeploy");
  ready ??= sql`CREATE TABLE IF NOT EXISTS plays (
      id bigserial PRIMARY KEY, ts timestamptz NOT NULL DEFAULT now(), client text NOT NULL, sid text NOT NULL,
      answer text, raw text NOT NULL DEFAULT '', wrong text[] NOT NULL DEFAULT '{}', tries int NOT NULL DEFAULT 0,
      mode text NOT NULL, day int NOT NULL, UNIQUE (client, sid))`
    .then(() => sql`CREATE INDEX IF NOT EXISTS plays_sid ON plays (sid)`)
    .catch(e => { ready = null; throw e; });
  return ready;
}

// the game also runs from a local file on the Desktop, so any origin may call the API
export function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  return false;
}

// report failures as JSON instead of a bare crash, without leaking the connection string
export const route = fn => async (req, res) => {
  if (cors(req, res)) return;
  try { await fn(req, res); }
  catch (e) { res.status(500).json({ error: String(e.message || e).replace(/postgres(ql)?:\/\/\S+/g, "[db url]") }); }
};
