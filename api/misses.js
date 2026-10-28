import { sql, ensureSchema, route } from "./_db.js";

// Rejected guesses, most common first: the to-do list of aliases and answers the bank is missing.
export default route(async (req, res) => {
  await ensureSchema();
  const rows = await sql`SELECT sid, w AS guess, count(*)::int AS c FROM plays, unnest(wrong) AS w
                         GROUP BY sid, w ORDER BY c DESC LIMIT 500`;
  res.status(200).json(rows);
});
