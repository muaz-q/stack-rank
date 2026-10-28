// Measure, don't guess: resolve every Stack Rank answer to a Wikipedia article and pull 12 months of
// real page views. Output data/wiki_views.json, one record per answer with the title it resolved to,
// so every number can be audited.  usage: node data/wiki_views.js [edition]
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), E = require(path.join(ROOT, "editions.js"));
const ed = process.argv[2] || "stackrank", e = E[ed];
global.BANKX = {}; global.BANK = {};
const bankSrc = (e.base ? fs.readFileSync(path.join(ROOT, e.base), "utf8") : "") + "\n" +
  e.keys.map(k => path.join(ROOT, e.bankDir, k + ".js")).filter(fs.existsSync).map(f => fs.readFileSync(f, "utf8")).join("\n");
Object.assign(BANK, new Function("BANKX", bankSrc + ";return typeof BANK !== 'undefined' ? BANK : {};")(BANKX));
for (const k in BANKX) BANK[k] = (BANK[k] || []).concat(BANKX[k]);
const LABEL = Object.fromEntries(e.edition.topics.map(t => [t[0], t[1]]));

const UA = { "User-Agent": "StackRankTrivia/1.0 (https://github.com/muaz-q; personal research)" };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { headers: UA }); if (r.status === 404) return null; if (r.ok) return r.json(); } catch { }
    await sleep(800 * (i + 1));
  }
  return null;
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const j = i++; await fn(items[j], j); } })); }

// 1) direct title lookup, 50 at a time, following redirects; flag disambiguation pages
async function resolveDirect(names) {
  const out = {};
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50);
    const j = await get("https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=disambiguation&titles=" + encodeURIComponent(batch.join("|")));
    if (!j) continue;
    const norm = Object.fromEntries((j.query.normalized || []).map(x => [x.from, x.to]));
    const red = Object.fromEntries((j.query.redirects || []).map(x => [x.from, x.to]));
    const pages = Object.values(j.query.pages || {});
    for (const n of batch) {
      let t = norm[n] || n; t = red[t] || t;
      const p = pages.find(p => p.title === t);
      if (p && !("missing" in p) && !(p.pageprops && "disambiguation" in p.pageprops)) out[n] = p.title;
    }
  }
  return out;
}
// 2) fallback: full-text search with the question's subject as context
async function resolveSearch(name, ctx) {
  const j = await get("https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srlimit=1&srsearch=" + encodeURIComponent(name + " " + ctx));
  return j && j.query.search[0] ? j.query.search[0].title : null;
}
async function views(title) {
  const j = await get(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(title.replace(/ /g, "_"))}/monthly/2025100100/2026093000`);
  return j ? j.items.reduce((s, x) => s + x.views, 0) : 0;
}

(async () => {
  const rows = [];
  for (const k in BANK) BANK[k].forEach((q, qi) => q.a.forEach(([name], ai) => rows.push({ k, qi, ai, p: q.p, name })));
  console.log(rows.length, "answers");
  const direct = await resolveDirect([...new Set(rows.map(r => r.name))]);
  await pool(rows, 8, async r => {
    r.title = direct[r.name] || null; r.how = r.title ? "direct" : "search";
    if (!r.title) r.title = await resolveSearch(r.name, LABEL[r.k] + " " + r.p.replace(/^Name (a|an) /, "").replace(/[.(].*$/, ""));
  });
  const titles = [...new Set(rows.map(r => r.title).filter(Boolean))];
  const v = {};
  await pool(titles, 10, async t => { v[t] = await views(t); });
  rows.forEach(r => r.views = r.title ? v[r.title] : 0);
  fs.writeFileSync(path.join(__dirname, ed + "_wiki_views.json"), JSON.stringify(rows));
  console.log("resolved", rows.filter(r => r.title).length, "titles", titles.length);
})();
