// Turn published data into starting shares, and say exactly where each one came from.
//   survey_stats.json          real survey percentages (Stack Overflow, StatCounter, JetBrains, ...)
//   stackrank_wiki_views.json  12 months of Wikipedia page views per answer
// Writes measured_stackrank.js: `const MEASURED = { "<prompt>": { src, note, a: { name: share } } }`
// and a report of every question that could not be measured.
const fs = require("fs"), path = require("path");
const D = __dirname;
const survey = JSON.parse(fs.readFileSync(path.join(D, "survey_stats.json"), "utf8"));
const wiki = JSON.parse(fs.readFileSync(path.join(D, "stackrank_wiki_views.json"), "utf8"));

const out = {}, report = { survey: 0, wiki: 0, unmeasured: [] };

// 1) surveys win wherever they exist; answers the survey does not list get half its smallest value
for (const s of survey) {
  const vals = Object.values(s.values).filter(v => v > 0);
  if (vals.length < 2) continue;                       // one number cannot rank anything
  out[s.p] = { src: s.source, url: s.url, metric: s.metric, unlisted: Math.min(...vals) / 2, a: { ...s.values } };
  report.survey++;
}

// 2) Wikipedia page views, only for questions whose every lookup was checked by hand. Automatic
// matching put "fish" (the shell) on the animal and "Zeus" (the malware) on the god, so nothing
// is trusted unreviewed.
const WIKI_REVIEWED = new Set([
  "Name a comparison sort with O(n log n) worst-case time.",
  "Name a database normal form.",
  "Name a password hashing or key derivation function.",
  "Name a file system.",
]);
const byQ = {};
for (const r of wiki) (byQ[r.p] ??= []).push(r);
for (const [p, rows] of Object.entries(byQ)) {
  if (out[p]) continue;
  if (!WIKI_REVIEWED.has(p)) { report.unmeasured.push({ p, why: "no published data; Wikipedia matching not reviewed" }); continue; }
  const titles = rows.map(r => r.title), count = {};
  titles.forEach(t => t && (count[t] = (count[t] || 0) + 1));
  // an article shared by several answers says nothing about which one people pick
  const clean = rows.filter(r => r.title && count[r.title] === 1 && r.views > 0);
  const share = clean.length / rows.length;
  if (clean.length < 5 || share < 0.7) {
    report.unmeasured.push({ p, clean: clean.length, of: rows.length, why: share < 0.7 ? "answers resolve to shared or missing articles" : "too few articles" });
    continue;
  }
  const a = Object.fromEntries(clean.map(r => [r.name, r.views]));
  out[p] = { src: "Wikipedia page views, Oct 2025 – Sep 2026", url: "https://wikimedia.org/api/rest_v1/", metric: "page views of each answer's article",
    unlisted: Math.min(...clean.map(r => r.views)) / 2, a, titles: Object.fromEntries(clean.map(r => [r.name, r.title])) };
  report.wiki++;
}

fs.writeFileSync(path.join(D, "measured_stackrank.js"), "const MEASURED = " + JSON.stringify(out) + ";\n");
fs.writeFileSync(path.join(D, "measured_report.json"), JSON.stringify(report, null, 1));
console.log("survey", report.survey, "wikipedia", report.wiki, "unmeasured", report.unmeasured.length);
