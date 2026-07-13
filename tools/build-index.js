// Builds lc-index.json: normalized LeetCode title -> companies ranked by frequency.
// Prereq: clone the public company-tags dataset next to this script:
//   git clone --depth 1 https://github.com/liquidslr/leetcode-company-wise-problems tools/lc-companies
// Then: node tools/build-index.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "lc-companies");
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// title -> Map(company -> freq)
const index = new Map();

function parseCsvLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

for (const company of fs.readdirSync(ROOT)) {
  const file = path.join(ROOT, company, "5. All.csv");
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split("\n").slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const title = cols[1];
    const freq = parseFloat(cols[2]) || 0;
    if (!title) continue;
    const key = norm(title);
    if (!index.has(key)) index.set(key, { title, companies: new Map() });
    const m = index.get(key).companies;
    m.set(company, Math.max(m.get(company) || 0, freq));
  }
}

const obj = {};
for (const [k, v] of index) {
  obj[k] = {
    title: v.title,
    companies: [...v.companies.entries()].sort((a, b) => b[1] - a[1]),
  };
}
fs.writeFileSync(path.join(__dirname, "lc-index.json"), JSON.stringify(obj));
console.log("indexed", index.size, "LeetCode problems -> tools/lc-index.json");
