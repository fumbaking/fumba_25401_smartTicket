// Logical ERD (crow's foot) for SmartTicket. Needs: npm install sharp
// Usage: node scripts/phase2/erd.js docs/design/erd.svg docs/design/erd.png
const fs = require("fs");
const sharp = require("sharp");

const W = 290, HDR = 30, RH = 19, COLX = i => 40 + i * 380;
const ROWY = [110, 500, 820, 1065];
const E = {};
function ent(name, c, r, cols, opt = {}) {
  E[name] = { name, x: COLX(c), y: ROWY[r] + (opt.dy || 0), w: W, h: HDR + cols.length * RH + 6, cols, note: opt.note };
}
ent("CATEGORIES", 0, 0, [["PK", "category_id"], ["U", "category_code"], ["", "category_name"], ["FK", "parent_category_id"]]);
ent("PERFORMERS", 1, 0, [["PK", "performer_id"], ["", "performer_name"], ["", "short_name"], ["FK", "category_id"], ["FK", "home_venue_id"]]);
ent("EVENT_PERFORMERS", 2, 0, [["PK,FK", "event_id"], ["PK,FK", "performer_id"]]);
ent("EVENTS", 3, 0, [["PK", "event_id"], ["FK", "category_id"], ["FK", "venue_id"], ["", "event_name"], ["", "short_name"],
  ["", "start_datetime_utc"], ["", "end_datetime_utc"], ["", "date_tbd"], ["", "time_tbd"], ["", "is_general_admission"],
  ["", "announced_on"], ["", "sales_open_at"], ["", "sales_close_at"], ["", "status"], ["", "is_rescheduled"]]);
ent("EVENT_PRICES", 4, 0, [["PK,FK", "event_id"], ["PK,FK", "tier_id"], ["", "price_rwf"]]);
ent("PUBLIC_HOLIDAYS", 0, 1, [["PK", "holiday_date"], ["", "holiday_name"]]);
ent("VENUES", 1, 1, [["PK", "venue_id"], ["", "venue_name"], ["", "street"], ["", "city"], ["", "state_region"], ["", "country"],
  ["", "postal_code"], ["", "time_zone"], ["", "latitude"], ["", "longitude"], ["", "capacity"]]);
ent("SECTIONS", 2, 1, [["PK", "section_id"], ["FK,U1", "venue_id"], ["U1", "section_code"], ["", "section_name"], ["FK", "tier_id"]]);
ent("TICKETS", 3, 1, [["PK", "ticket_id"], ["FK,U1", "event_id"], ["FK,U1", "section_id"], ["U1", "row_label"], ["U1", "seat_no"], ["", "delivery_type"], ["", "status"]]);
ent("PRICE_TIERS", 4, 1, [["PK", "tier_id"], ["U", "tier_code"], ["", "tier_name"], ["", "default_price_rwf"], ["U", "tier_rank"]]);
ent("AUDIT_LOG", 0, 2, [["PK", "audit_id"], ["", "db_user"], ["", "action_type"], ["", "table_name"], ["", "record_key"], ["", "action_time"], ["", "action_status"], ["", "message"]]);
ent("CUSTOMERS", 1, 2, [["PK", "customer_id"], ["U", "customer_code"], ["", "region"], ["", "registered_at"]]);
ent("BOOKINGS", 2, 2, [["PK", "booking_id"], ["FK", "customer_id"], ["", "booked_at"], ["", "hold_expires_at"], ["", "status"]]);
ent("BOOKING_ITEMS", 3, 2, [["PK", "booking_item_id"], ["FK,U1", "booking_id"], ["FK,U1", "ticket_id"], ["", "price_paid_rwf"]]);
ent("GATE_SCANS", 4, 2, [["PK", "scan_id"], ["FK", "ticket_id"], ["", "gate_code"], ["", "scanned_at"], ["", "scan_result"], ["", "denial_reason"]]);
ent("PAYMENTS", 2, 3, [["PK", "payment_id"], ["FK", "booking_id"], ["", "method"], ["", "amount_rwf"], ["U", "payment_reference"], ["", "status"], ["", "paid_at"]]);

// anchor points
const T = (n, dx) => [E[n].x + dx, E[n].y];
const B = (n, dx) => [E[n].x + dx, E[n].y + E[n].h];
const L = (n, dy) => [E[n].x, E[n].y + dy];
const R = (n, dy) => [E[n].x + E[n].w, E[n].y + dy];

// [points from PARENT to CHILD], parent symbol, child symbol, label, label segment index
const G1 = 462, G2 = 772;
const rels = [
  [[R("CATEGORIES", 60), L("PERFORMERS", 60)], "||", "o<", "classifies"],
  [[L("CATEGORIES", 48), [18, E.CATEGORIES.y + 48], [18, E.CATEGORIES.y + E.CATEGORIES.h + 26], [E.CATEGORIES.x + 70, E.CATEGORIES.y + E.CATEGORIES.h + 26], B("CATEGORIES", 70)], "o|", "o<", "parent of", 2],
  [[T("CATEGORIES", 200), [E.CATEGORIES.x + 200, 72], [E.EVENTS.x + 60, 72], T("EVENTS", 60)], "||", "o<", "classifies", 1],
  [[R("PERFORMERS", 50), L("EVENT_PERFORMERS", 50)], "||", "o<", "plays in"],
  [[L("EVENTS", 50), R("EVENT_PERFORMERS", 50)], "||", "|<", "features"],
  [[R("EVENTS", 50), L("EVENT_PRICES", 50)], "||", "o<", "is priced in"],
  [[T("PRICE_TIERS", 145), B("EVENT_PRICES", 145)], "||", "o<", "prices"],
  [[T("VENUES", 110), B("PERFORMERS", 110)], "o|", "o<", "home of"],
  [[R("VENUES", 50), L("SECTIONS", 50)], "||", "o<", "has"],
  [[T("VENUES", 250), [E.VENUES.x + 250, G1], [E.EVENTS.x + 60, G1], B("EVENTS", 60)], "||", "o<", "hosts", 1],
  [[R("SECTIONS", 50), L("TICKETS", 50)], "||", "o<", "contains"],
  [[B("EVENTS", 200), T("TICKETS", 200)], "||", "o<", "issues"],
  [[B("PRICE_TIERS", 145), [E.PRICE_TIERS.x + 145, G2], [E.SECTIONS.x + 145, G2], B("SECTIONS", 145)], "||", "o<", "groups", 2],
  [[B("TICKETS", 145), T("BOOKING_ITEMS", 145)], "||", "o<", "booked as"],
  [[B("TICKETS", 250), [E.TICKETS.x + 250, 797], [E.GATE_SCANS.x + 200, 797], T("GATE_SCANS", 200)], "||", "o<", "scanned at", 1],
  [[R("CUSTOMERS", 50), L("BOOKINGS", 50)], "||", "o<", "makes"],
  [[R("BOOKINGS", 50), L("BOOKING_ITEMS", 50)], "||", "|<", "contains"],
  [[B("BOOKINGS", 145), T("PAYMENTS", 145)], "||", "o<", "paid by"],
];

const INK = "#3A3550", HEAD = "#2B1B4A", AMBER = "#B26A00", PURPLE = "#6A3FC8";
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let lines = "", boxes = "", marks = "", labels = "";

function marker([px, py], [ux, uy], type) {
  const nx = -uy, ny = ux, at = k => [px + ux * k, py + uy * k];
  const bar = k => { const [cx, cy] = at(k); return `<line x1="${cx + nx * 8}" y1="${cy + ny * 8}" x2="${cx - nx * 8}" y2="${cy - ny * 8}"/>`; };
  const circ = k => { const [cx, cy] = at(k); return `<circle cx="${cx}" cy="${cy}" r="5" fill="#fff"/>`; };
  const crow = () => { const [cx, cy] = at(16); return `<polyline fill="none" points="${px + nx * 9},${py + ny * 9} ${cx},${cy} ${px - nx * 9},${py - ny * 9}"/><line x1="${px}" y1="${py}" x2="${cx}" y2="${cy}"/>`; };
  const m = { "||": bar(8) + bar(14), "o|": bar(8) + circ(19), "|<": crow() + bar(21), "o<": crow() + circ(23) }[type];
  return `<g stroke="${INK}" stroke-width="1.6">${m}</g>`;
}
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };

for (const [pts, ps, cs, label, seg = 0] of rels) {
  const d = pts.map(p => p.join(",")).join(" ");
  lines += `<polyline points="${d}" fill="none" stroke="#fff" stroke-width="7"/><polyline points="${d}" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
  marks += marker(pts[0], unit(pts[0], pts[1]), ps) + marker(pts.at(-1), unit(pts.at(-1), pts.at(-2)), cs);
  const a = pts[seg], b = pts[seg + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, horiz = a[1] === b[1];
  labels += horiz
    ? `<text x="${mx}" y="${my - 6}" text-anchor="middle" class="lab">${esc(label)}</text>`
    : `<text x="${mx + 7}" y="${my + 4}" class="lab">${esc(label)}</text>`;
}

for (const e of Object.values(E)) {
  boxes += `<g><rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="6" fill="#fff" stroke="${HEAD}" stroke-width="1.5"/>
  <path d="M${e.x} ${e.y + HDR} V${e.y + 6} a6 6 0 0 1 6 -6 H${e.x + e.w - 6} a6 6 0 0 1 6 6 V${e.y + HDR} Z" fill="${HEAD}"/>
  <text x="${e.x + e.w / 2}" y="${e.y + 20}" text-anchor="middle" class="hdr">${e.name}</text>`;
  e.cols.forEach(([k, c], i) => {
    const y = e.y + HDR + 15 + i * RH;
    const col = k.startsWith("PK") ? AMBER : k.includes("FK") ? PURPLE : "#777";
    boxes += `<text x="${e.x + 10}" y="${y}" class="key" fill="${col}">${k}</text><text x="${e.x + 66}" y="${y}" class="col${k.startsWith("PK") ? " pk" : ""}">${c}</text>`;
  });
  boxes += `</g>`;
}

// legend
const lx = COLX(3), ly = ROWY[3];
let legend = `<rect x="${lx}" y="${ly}" width="${W * 2 + 90}" height="190" rx="6" fill="#F7F5FB" stroke="#CFC8E0"/>
<text x="${lx + 16}" y="${ly + 26}" class="hdr2">Legend (crow's foot)</text>`;
[["||", "exactly one (mandatory)"], ["o|", "zero or one (optional)"], ["|<", "one or many"], ["o<", "zero or many"]].forEach(([t, txt], i) => {
  const y = ly + 56 + i * 30, x0 = lx + 20;
  legend += `<line x1="${x0}" y1="${y}" x2="${x0 + 70}" y2="${y}" stroke="${INK}" stroke-width="1.6"/>` + marker([x0 + 70, y], [-1, 0], t) +
    `<text x="${x0 + 86}" y="${y + 4}" class="col">${txt}</text>`;
});
legend += `<text x="${lx + 330}" y="${ly + 60}" class="col"><tspan fill="${AMBER}" font-weight="bold">PK</tspan> primary key</text>
<text x="${lx + 330}" y="${ly + 86}" class="col"><tspan fill="${PURPLE}" font-weight="bold">FK</tspan> foreign key</text>
<text x="${lx + 330}" y="${ly + 112}" class="col"><tspan fill="#777" font-weight="bold">U / U1</tspan> unique (U1 = unique together)</text>
<text x="${lx + 330}" y="${ly + 138}" class="col">Data types are added in Phase IV.</text>
<text x="${lx + 330}" y="${ly + 164}" class="col">PUBLIC_HOLIDAYS, AUDIT_LOG: used by triggers.</text>`;

const WIDTH = COLX(4) + W + 40, HEIGHT = ly + 230;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH * 1.6}" height="${HEIGHT * 1.6}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<style>
 text{font-family:Arial,Helvetica,sans-serif}
 .hdr{font-size:14px;font-weight:bold;fill:#fff;letter-spacing:.5px}
 .hdr2{font-size:15px;font-weight:bold;fill:${HEAD}}
 .key{font-size:10.5px;font-weight:bold}
 .col{font-size:12.5px;fill:#222}
 .pk{font-weight:bold}
 .lab{font-size:11.5px;fill:#5A5470;font-style:italic}
 .title{font-size:22px;font-weight:bold;fill:${HEAD}}
 .sub{font-size:13px;fill:#555}
</style>
<rect width="100%" height="100%" fill="#fff"/>
<text x="40" y="34" class="title">SmartTicket: logical ERD (3NF, 16 tables)</text>
<text x="40" y="54" class="sub">FUMBA Huriro · 25401 · INSY 8311 Phase II · crow's-foot notation</text>
${lines}${boxes}${marks}${labels}${legend}
</svg>`;
fs.writeFileSync(process.argv[2], svg);
sharp(Buffer.from(svg)).png().toFile(process.argv[3]).then(i => console.log("png", i.width, i.height));
