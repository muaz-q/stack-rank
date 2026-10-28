import { sql, ensureSchema, route } from "./_db.js";

// Real answer counts for every question: { sid: { n, passed, answers: { name: count } } }
export default route(async (req, res) => {
  await ensureSchema();
  const rows = await sql`SELECT sid, answer, count(*)::int AS c FROM plays GROUP BY sid, answer`;
  const out = {};
  for (const { sid, answer, c } of rows) {
    const q = out[sid] ??= { n: 0, passed: 0, answers: {} };
    q.n += c;
    if (answer == null) q.passed += c; else q.answers[answer] = c;
  }
  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
  res.status(200).json(out);
});
