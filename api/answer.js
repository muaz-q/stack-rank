import { sql, ensureSchema, route } from "./_db.js";

const str = (v, n) => typeof v === "string" ? v.trim().slice(0, n) : "";
const ID = /^[a-z0-9]{4,40}$/;

export default route(async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const client = str(b.client, 40), sid = str(b.sid, 40);
  if (!ID.test(client) || !ID.test(sid)) return res.status(400).json({ error: "bad id" });
  const answer = b.answer == null ? null : str(b.answer, 80) || null;
  const wrong = Array.isArray(b.wrong) ? b.wrong.slice(0, 20).map(w => str(w, 60)).filter(Boolean) : [];
  const tries = Math.max(0, Math.min(99, b.tries | 0)), day = Math.max(0, Math.min(1e5, b.day | 0));
  const mode = ["daily", "pack", "unlimited"].includes(b.mode) ? b.mode : "unlimited";
  await ensureSchema();
  await sql`INSERT INTO plays (client, sid, answer, raw, wrong, tries, mode, day)
            VALUES (${client}, ${sid}, ${answer}, ${str(b.raw, 60).toLowerCase()}, ${wrong}, ${tries}, ${mode}, ${day})
            ON CONFLICT (client, sid) DO NOTHING`;
  res.status(204).end();
});
