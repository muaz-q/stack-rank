import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL);

let ready;
export function ensureSchema() {
  ready ??= sql`CREATE TABLE IF NOT EXISTS plays (
      id bigserial PRIMARY KEY, ts timestamptz NOT NULL DEFAULT now(), client text NOT NULL, sid text NOT NULL,
      answer text, raw text NOT NULL DEFAULT '', wrong text[] NOT NULL DEFAULT '{}', tries int NOT NULL DEFAULT 0,
      mode text NOT NULL, day int NOT NULL, UNIQUE (client, sid))`
    .then(() => sql`CREATE INDEX IF NOT EXISTS plays_sid ON plays (sid)`);
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
