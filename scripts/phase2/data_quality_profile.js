// Data-quality profile of data/raw (read-only, changes nothing).
// Usage: node scripts/phase2/data_quality_profile.js data/raw
const fs = require("fs"), path = require("path");
const RAW = process.argv[2];

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

const venues = load(path.join(RAW, "venues.csv"));
const performers = load(path.join(RAW, "performers.csv"));
const events = loadDir(path.join(RAW, "events"));
const listings = loadDir(path.join(RAW, "event-listings"));

function colStats(name, rows) {
  const cols = Object.keys(rows[0]).filter(c => c !== "__file");
  console.log(`\n### ${name}: ${rows.length} rows, ${cols.length} columns`);
  for (const c of cols) {
    let nul = 0, prem = 0, empty = 0; const d = new Set();
    for (const r of rows) { const v = r[c]; if (v === null || v === undefined) nul++; else if (v === "") empty++; else if (v === "[PREMIUM]") prem++; else d.add(v); }
    const sample = [...d].slice(0, 4).join(" | ").slice(0, 90);
    console.log(`${c}\tnull=${nul}\tempty=${empty}\tpremium=${prem}\tdistinct=${d.size}\t${sample}`);
  }
}
colStats("venues", venues); colStats("performers", performers);
colStats("events", events); colStats("listings", listings);

const cnt = (arr, f) => { const m = {}; for (const x of arr) { const k = f(x); m[k] = (m[k] || 0) + 1; } return m; };
const venueIds = new Set(venues.map(v => v.venueId)), perfIds = new Set(performers.map(p => p.performerId));
console.log("\n### Checks");
console.log("venue dup ids", venues.length - venueIds.size, "| perf dup ids", performers.length - perfIds.size);
console.log("venue dup names", venues.length - new Set(venues.map(v => v.name.toLowerCase())).size);
console.log("venue capacity 0/null", venues.filter(v => !v.capacity || v.capacity === "0").length);
console.log("venue countries", JSON.stringify(cnt(venues, v => v.addressCountry)));
console.log("venue postal null", venues.filter(v => !v.addressPostalCode).length);
console.log("perf homeVenue null", performers.filter(p => !p.homeVenueId).length, "| homeVenue not in venues", performers.filter(p => p.homeVenueId && !venueIds.has(p.homeVenueId)).length);
console.log("perf type", JSON.stringify(cnt(performers, p => p.type)));
console.log("perf taxonomy", JSON.stringify(cnt(performers, p => p.taxonomyName + "/" + p.taxonomySubName)));

const evIds = new Set(events.map(e => e.eventId));
console.log("events unique", evIds.size, "dup rows", events.length - evIds.size);
const byEv = {}; for (const e of events) (byEv[e.eventId] ||= []).push(e);
const multi = Object.values(byEv).filter(a => a.length > 1);
const changed = multi.filter(a => new Set(a.map(e => e.datetimeUtc + e.status + e.name)).size > 1);
console.log("events seen >1 snapshot", multi.length, "| of which values differ", changed.length);
console.log("event venue not in venues", events.filter(e => !venueIds.has(e.venueId)).length,
  "unique events:", new Set(events.filter(e => !venueIds.has(e.venueId)).map(e => e.eventId)).size);
let pl = 0, pmiss = 0, pempty = 0; const pmissSet = new Set(); const nPerf = {};
for (const e of Object.values(byEv).map(a => a[0])) {
  const ids = JSON.parse(e.performerIds || "[]"); if (!ids.length) pempty++; nPerf[ids.length] = (nPerf[ids.length] || 0) + 1;
  for (const id of ids) { pl++; if (!perfIds.has(String(id))) { pmiss++; pmissSet.add(id); } }
}
console.log("event-performer links", pl, "missing perf links", pmiss, "distinct missing", pmissSet.size, "events no performer", pempty, "perf-count dist", JSON.stringify(nPerf));
console.log("event status", JSON.stringify(cnt(events, e => e.status)), "schedule", JSON.stringify(cnt(events, e => e.scheduleStatus)));
console.log("event type", JSON.stringify(cnt(events, e => e.type)));
console.log("event taxonomy", JSON.stringify(cnt(events, e => e.taxonomyName + "/" + e.taxonomySubName)));
console.log("event end null", events.filter(e => !e.endDatetimeUtc).length, "timeTbd true", events.filter(e => e.timeTbd === "true").length, "dateTbd true", events.filter(e => e.dateTbd === "true").length);
console.log("event end<start", events.filter(e => e.endDatetimeUtc && e.endDatetimeUtc < e.datetimeUtc).length);
console.log("event announceDate null", events.filter(e => !e.announceDate).length);
console.log("event provider", JSON.stringify(cnt(events, e => e.integratedProvider)));

const lIds = new Set(listings.map(l => l.listingId));
console.log("listings unique ids", lIds.size, "dup", listings.length - lIds.size);
console.log("listing event not in events", listings.filter(l => !evIds.has(l.eventId)).length, "distinct", new Set(listings.filter(l => !evIds.has(l.eventId)).map(l => l.eventId)).size);
console.log("listing distinct events", new Set(listings.map(l => l.eventId)).size);
let seatsEmpty = 0, mism = 0, seatTotal = 0, nonNumSeat = 0, dupSeat = 0;
const seatKey = new Map();
for (const l of listings) {
  const s = l.seats ? JSON.parse(l.seats.replace(/'/g, '"')) : [];
  if (!s.length) seatsEmpty++; else if (s.length !== +l.quantity) mism++;
  seatTotal += s.length; nonNumSeat += s.filter(x => !/^\d+$/.test(x)).length;
  for (const x of s) { const k = [l.eventId, l.section, l.row, x].join("|"); if (seatKey.has(k) && seatKey.get(k) !== l.listingId) dupSeat++; else seatKey.set(k, l.listingId); }
}
console.log("seats empty", seatsEmpty, "qty mismatch", mism, "seat total", seatTotal, "non-numeric seats", nonNumSeat, "seat dup across listings", dupSeat);
console.log("row null", listings.filter(l => !l.row).length, "row non-numeric", listings.filter(l => l.row && !/^\d+$/.test(l.row)).length,
  "row samples", [...new Set(listings.filter(l => l.row && !/^\d+$/.test(l.row)).map(l => l.row))].slice(0, 12).join(","));
console.log("inHand null", listings.filter(l => !l.inHandDate).length);
console.log("delivery", JSON.stringify(cnt(listings, l => l.deliveryType)), "market", JSON.stringify(cnt(listings, l => l.marketplace)));
console.log("qty dist", JSON.stringify(cnt(listings, l => l.quantity)));
const pref = cnt(listings, l => (l.sectionFull || "").replace(/\s*[\w-]*\d[\w-]*$/, "").trim() || "(none)");
console.log("sectionFull prefixes", JSON.stringify(pref));
const secPairs = new Set(listings.map(l => l.eventId + "|" + l.section));
const venueSec = new Set(listings.filter(l => evIds.has(l.eventId)).map(l => byEv[l.eventId][0].venueId + "|" + l.section));
console.log("distinct event+section", secPairs.size, "distinct venue+section", venueSec.size);
const secFullVariants = {}; for (const l of listings) { const k = byEv[l.eventId] ? byEv[l.eventId][0].venueId + "|" + l.section : "x"; (secFullVariants[k] ||= new Set()).add(l.sectionFull); }
console.log("venue+section with >1 sectionFull spelling", Object.values(secFullVariants).filter(s => s.size > 1).length);
console.log("listing section null", listings.filter(l => !l.section).length, "sectionFull null", listings.filter(l => !l.sectionFull).length);
console.log("listing seen >1 day (firstSeen != lastSeen)", listings.filter(l => l._firstSeenAt !== l._lastSeenAt).length);
