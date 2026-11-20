const fs = require("fs"), path = require("path");
function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false, quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') { q = true; quoted = true; }
    else if (c === ",") { row.push(quoted ? f : (f === "" ? null : f)); f = ""; quoted = false; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(quoted ? f : (f === "" ? null : f)); rows.push(row); row = []; f = ""; quoted = false;
    } else f += c;
  }
  if (f !== "" || row.length) { row.push(quoted ? f : (f === "" ? null : f)); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, k) => [h, r[k]])));
}
const load = p => parseCSV(fs.readFileSync(p, "utf8"));
const loadDir = d => fs.readdirSync(d).filter(f => f.endsWith(".csv")).sort()
  .flatMap(f => load(path.join(d, f)).map(r => ({ ...r, __file: f })));
module.exports={parseCSV,load,loadDir};
