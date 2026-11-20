// Phase I: builds the editable draw.io BPMN model of the SmartTicket
// "Ticket booking, payment and gate admission" process.
// Usage: node scripts/phase1/bpmn.js <out.drawio> [render.html] [zoom] [out.bpmn]
//   out.drawio  - editable diagram (open in https://app.diagrams.net)
//   render.html - optional page that draws the diagram with the draw.io viewer (used to print the PDF)
//   out.bpmn    - optional BPMN 2.0 XML with diagram layout (open in https://demo.bpmn.io)
// Also prints the draw.io "Publish -> Link" style viewer URL for the diagram.
const fs = require("fs");
const zlib = require("zlib");

const [, , OUT, RENDER, ZOOM = "0.47", BPMN_OUT] = process.argv;
const META = {};       // id -> BPMN 2.0 element info (used for the bpmn.io export)
if (!OUT) { console.error("usage: node bpmn.js out.drawio [render.html] [zoom]"); process.exit(1); }

// ---------- layout (absolute coordinates) ----------
const X0 = 0, Y0 = 70, POOL_W = 3200, POOL_HDR = 30, LANE_HDR = 120;
const LANES = [
  { id: "lane_customer", name: "Customer\n(ticket buyer)", h: 210, fill: "#F3F8FF" },
  { id: "lane_db", name: "SmartTicket Database\n(Oracle PDB:\nPL/SQL packages,\ntriggers, scheduler job)", h: 350, fill: "#F4FBF4" },
  { id: "lane_pay", name: "Payment Provider\n(MTN MoMo / card,\nexternal)", h: 140, fill: "#FFF9F0" },
  { id: "lane_gate", name: "Gate Staff\n(venue entry)", h: 200, fill: "#FBF5FF" },
  { id: "lane_org", name: "Event Organiser\n(Power BI\ndashboard)", h: 210, fill: "#F7F7F7" },
];
let y = Y0;
for (const l of LANES) { l.y = y; y += l.h; }
const POOL_H = y - Y0;
const L = Object.fromEntries(LANES.map(l => [l.id, l]));
const CY = {
  cust: L.lane_customer.y + 105,
  db1: L.lane_db.y + 100,
  db2: L.lane_db.y + 260,
  pay: L.lane_pay.y + 70,
  gate: L.lane_gate.y + 70,
  org: L.lane_org.y + 95,
};

// CRUD colour codes
const COL = { C: "#1B7F3B", R: "#1F5FA8", U: "#C25E00", D: "#7A1F1F" };
const tag = (k, txt) => `<font color="${COL[k]}"><b>${k}</b></font>&nbsp;${txt}`;
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const cells = [];      // vertices and edges in order
const V = {};          // id -> {x,y,w,h,lane}
function laneOf(cy) { return LANES.find(l => cy >= l.y && cy < l.y + l.h); }
function vertex(id, cx, cy, w, h, value, style) {
  const lane = laneOf(cy);
  V[id] = { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy, lane };
  cells.push({ kind: "v", id, value, style, lane: lane.id, x: cx - w / 2 - (X0 + POOL_HDR), y: cy - h / 2 - lane.y, w, h });
}

// Task: number, title, CRUD lines
const TASK_STYLE = "rounded=1;arcSize=8;whiteSpace=wrap;html=1;strokeColor=#333333;fillColor=#FFFFFF;fontSize=11;align=center;verticalAlign=middle;spacing=4;";
function task(id, n, cx, cy, title, data = [], opt = {}) {
  const w = opt.w || 176, h = opt.h || (data.length ? 44 + data.length * 14 : 66) + (opt.code && data.length ? 12 : 0);
  let v = `<b>${n}. ${title}</b>`;
  if (opt.code) v += `<br><i style="font-size:9.5px">${opt.code}</i>`;
  if (data.length) v += `<div style="text-align:left;font-size:10px;margin-top:3px;line-height:1.25">${data.map(([k, t]) => tag(k, t)).join("<br>")}</div>`;
  vertex(id, cx, cy, w, h, v, TASK_STYLE + (data.length ? "strokeWidth=1.6;" : ""));
  const lines = [];
  for (const [k, t] of data) { const txt = t.replace(/&nbsp;/g, "").trim(); if (k) lines.push(`${k}: ${txt}`); else lines[lines.length - 1] += " " + txt; }
  META[id] = { type: "task", name: [`${n}. ${title}`, ...lines].join("\n"), doc: opt.code || "", data: data.length > 0 };
}
const EV = "shape=mxgraph.bpmn.event;html=1;perimeter=ellipsePerimeter;outlineConnect=0;aspect=fixed;whiteSpace=wrap;fontSize=10;labelBackgroundColor=none;";
const below = "verticalLabelPosition=bottom;verticalAlign=top;labelWidth=110;";
function startEv(id, cx, cy, label, symbol = "general", pos = below) {
  vertex(id, cx, cy, 36, 36, label, EV + `outline=standard;symbol=${symbol};fillColor=#E8F5E9;strokeColor=#2E7D32;` + pos);
  META[id] = { type: "startEvent", name: label.replace(/\n/g, " "), symbol, right: pos.includes("labelPosition=right") };
}
function endEv(id, cx, cy, label, pos = below) {
  vertex(id, cx, cy, 36, 36, label, EV + "outline=end;symbol=terminate2;fillColor=#FFEBEE;strokeColor=#B71C1C;" + pos);
  META[id] = { type: "endEvent", name: label.replace(/\n/g, " "), right: pos.includes("labelPosition=right") };
}
function gateway(id, cx, cy, label, pos = "verticalLabelPosition=top;verticalAlign=bottom;labelWidth=150;") {
  vertex(id, cx, cy, 52, 52, label, "shape=mxgraph.bpmn.gateway2;html=1;perimeter=rhombusPerimeter;outlineConnect=0;gwType=exclusive;whiteSpace=wrap;fontSize=10.5;fillColor=#FFFDE7;strokeColor=#8D6E00;labelBackgroundColor=none;" + pos);
  META[id] = { type: "exclusiveGateway", name: label };
}

// port helpers: [vertexId, side]  side in t,b,l,r or [fx,fy]
const SIDE = { t: [0.5, 0], b: [0.5, 1], l: [0, 0.5], r: [1, 0.5] };
let eid = 0;
function flow(src, tgt, opts = {}) {
  const { from = "r", to = "l", pts = [], label = "", lx = 0, ly = 0, dashed = false, style = "" } = opts;
  const [ex, ey] = Array.isArray(from) ? from : SIDE[from];
  const [nx, ny] = Array.isArray(to) ? to : SIDE[to];
  const base = dashed
    ? "endArrow=open;endFill=0;dashed=1;dashPattern=6 4;strokeColor=#555555;"
    : "endArrow=block;endFill=1;strokeColor=#333333;";
  cells.push({
    kind: "e", id: `f${++eid}`, src, tgt, value: label, pts, lx, ly, ex, ey, nx, ny, dashed,
    style: `edgeStyle=none;html=1;rounded=0;fontSize=10;labelBackgroundColor=#FFFFFF;${base}exitX=${ex};exitY=${ey};exitDx=0;exitDy=0;entryX=${nx};entryY=${ny};entryDx=0;entryDy=0;${style}`,
  });
}

// ---------- process content ----------
// Organiser publishes the event (precondition for sales)
startEv("s_org", 200, CY.org, "Event approved for sale", "general", below.replace("110", "80"));
task("t1", 1, 340, CY.org, "Publish event, prices and seats", [["C", "EVENTS (SCHEDULED)"], ["C", "EVENT_PRICES (per tier)"], ["C", "TICKETS (AVAILABLE)"]]);
flow("s_org", "t1");

// Customer browses and selects
task("t2", 2, 340, CY.cust, "Browse open events and free seats", [["R", "EVENTS, EVENT_PRICES"], ["R", "TICKETS via fn_available_seats"]]);
flow("t1", "t2", { from: "t", to: "b", label: "event on sale", lx: 0, ly: 0 });
task("t3", 3, 540, CY.cust, "Select seats (max 6 per event)", [], { w: 150 });
flow("t2", "t3");

// Validation in the database
task("t4", 4, 720, CY.db1, "Validate booking request", [["R", "EVENTS (status, sales window)"], ["R", "TICKETS (status)"], ["R", "fn_customer_ticket_count"]], { code: "pkg_ticketing.sp_book_tickets" });
flow("t3", "t4", { from: "r", to: "t", pts: [[720, CY.cust]], label: "customer, event, seat list" });
gateway("g1", 890, CY.db1, "Event open for sale?");
flow("t4", "g1");
task("t5", 5, 890, CY.db2, "Refuse: event closed", [["C", "AUDIT_LOG (DENIED,"], ["", "&nbsp;&nbsp;&nbsp;ORA-20003)"]], { w: 150 });
flow("g1", "t5", { from: "b", to: "t", label: "No" });
endEv("e_refused", 730, CY.db2, "Booking refused\n(customer told why)");
flow("t5", "e_refused", { from: "l", to: "r" });

gateway("g2", 1060, CY.db1, "Seats free and customer within 6 tickets?");
flow("g1", "g2", { label: "Yes" });
task("t6", 6, 1060, CY.db2, "Refuse seats, log attempt", [["C", "AUDIT_LOG (DENIED,"], ["", "&nbsp;&nbsp;&nbsp;ORA-20001 / ORA-20002)"]], { w: 150 });
flow("g2", "t6", { from: "b", to: "t", label: "No" });
// back to seat selection, routed along the bottom of the DB lane
const yBack = L.lane_db.y + L.lane_db.h - 14;
flow("t6", "t3", { from: "b", to: [0.3, 1], pts: [[1060, yBack], [510, yBack]], label: "choose other seats", lx: 0, ly: 0 });

task("t7", 7, 1240, CY.db1, "Hold seats, create booking", [["C", "BOOKINGS (PENDING, +15 min)"], ["C", "BOOKING_ITEMS (price paid)"], ["U", "TICKETS → HELD"], ["C", "AUDIT_LOG (BOOK)"]], { code: "pkg_ticketing.sp_book_tickets" });
flow("g2", "t7", { label: "Yes" });

// Customer pays
task("t8", 8, 1240, CY.cust, "Pay with MoMo or card", [], { w: 160 });
flow("t7", "t8", { from: "t", to: "b", label: "booking no., total" });
// timer boundary on task 8
vertex("bt_timer", 1290, V.t8.y, 30, 30, "", EV + "outline=boundInt;symbol=timer;fillColor=#FFFFFF;strokeColor=#333333;");
endEv("e_expired", 1400, L.lane_customer.y + 30, "Hold expired (15 min)", "labelPosition=right;align=left;verticalLabelPosition=middle;verticalAlign=middle;labelWidth=120;");
flow("bt_timer", "e_expired", { from: "t", to: "l", pts: [[1290, L.lane_customer.y + 30]] });

task("t9", 9, 1520, CY.pay, "Process payment, return reference", [], { w: 160 });
flow("t8", "t9", { from: [1, 46 / 66], to: "t", pts: [[1520, CY.cust + 13]], label: "amount, phone / card", lx: 0.55 });

task("t10", 10, 1640, CY.db1, "Record payment, check amount", [["C", "PAYMENTS (PENDING)"], ["R", "BOOKING_ITEMS (fn_booking_total)"]], { code: "pkg_ticketing.sp_record_payment", w: 196 });
flow("t9", "t10", { from: "r", to: "b", pts: [[1640, CY.pay]], label: "reference, result" });
gateway("g3", 1810, CY.db1, "Approved and amount = booking total?");
flow("t10", "g3");
task("t11", 11, 1810, CY.db2, "Reject payment, log attempt", [["U", "PAYMENTS → FAILED"], ["C", "AUDIT_LOG (DENIED, ORA-20005)"]], { w: 196 });
flow("g3", "t11", { from: "b", to: "t", label: "No" });
gateway("g4", 1930, CY.cust - 13, "Retry payment?", "verticalLabelPosition=top;verticalAlign=bottom;labelWidth=110;");
flow("t11", "g4", { from: "r", to: "b", pts: [[1930, CY.db2]], label: "payment failed", lx: 0.6 });
flow("g4", "t8", { from: "l", to: [1, 20 / 66], label: "Yes (hold still valid)" });
endEv("e_abandon", 2040, CY.cust - 13, "Payment abandoned");
flow("g4", "e_abandon", { label: "No" });

task("t12", 12, 2070, CY.db1, "Confirm booking, issue tickets", [["U", "PAYMENTS → COMPLETED"], ["U", "BOOKINGS → CONFIRMED"], ["U", "TICKETS → SOLD"], ["C", "AUDIT_LOG (PAY)"]], { code: "pkg_ticketing.sp_record_payment" });
flow("g3", "t12", { label: "Yes" });

// Scheduler sub-flow (independent of a single booking): releases unpaid holds
startEv("s_job", 1180, CY.db2, "Every minute\n(DBMS_SCHEDULER)", "timer");
task("t13", 13, 1350, CY.db2, "Release expired holds", [["R", "BOOKINGS (PENDING, expired)"], ["U", "BOOKINGS → EXPIRED"], ["U", "TICKETS → AVAILABLE"], ["C", "AUDIT_LOG"]], { code: "sp_release_expired_holds (cursor)", w: 176 });
flow("s_job", "t13");
endEv("e_released", 1470, CY.db2 + 70, "Seats back on sale", "labelPosition=right;align=left;verticalLabelPosition=middle;verticalAlign=middle;labelWidth=80;");
flow("t13", "e_released", { from: "b", to: "l", pts: [[1350, CY.db2 + 70]] });

// Customer gets e-ticket, goes to the gate
task("t14", 14, 2250, CY.cust, "Receive e-ticket (QR code)", [["R", "TICKETS, BOOKING_ITEMS"]], { w: 160 });
flow("t12", "t14", { from: "r", to: "b", pts: [[2250, CY.db1]], label: "QR = ticket_id" });
task("t15", 15, 2430, CY.cust, "Arrive on event day, show QR", [], { w: 160 });
flow("t14", "t15");

task("t16", 16, 2610, CY.gate, "Scan QR code at gate", [], { w: 160 });
flow("t15", "t16", { from: "b", to: "l", pts: [[2430, CY.gate]], label: "QR code" });

task("t17", 17, 2610, CY.db1, "Validate ticket", [["R", "TICKETS (status, event)"], ["R", "GATE_SCANS (earlier scans)"]], { code: "pkg_gate.sp_scan_ticket" });
flow("t16", "t17", { from: "t", to: "b", label: "ticket_id, gate" });
gateway("g5", 2790, CY.db1, "Ticket SOLD, for this event, not yet used?");
flow("t17", "g5");
task("t18", 18, 2980, CY.db1, "Record admission", [["C", "GATE_SCANS (ADMITTED)"], ["U", "TICKETS → USED"], ["C", "AUDIT_LOG (SCAN)"]]);
flow("g5", "t18", { label: "Yes" });
task("t19", 19, 2790, CY.db2, "Record denied scan", [["C", "GATE_SCANS (DENIED, reason)"], ["C", "AUDIT_LOG (DENIED, ORA-20004)"]], { code: "trg_single_entry", w: 180 });
flow("g5", "t19", { from: "b", to: "t", label: "No" });

task("t20", 20, 2980, CY.gate, "Admit attendee", [], { w: 150 });
flow("t18", "t20", { from: "b", to: "t", label: "ADMITTED" });
endEv("e_admitted", 3130, CY.gate, "Attendee admitted");
flow("t20", "e_admitted");
task("t21", 21, 2790, CY.gate, "Refuse entry, send to help desk", [], { w: 160 });
flow("t19", "t21", { from: "b", to: "t", label: "DENIED + reason" });
endEv("e_denied", 2790, CY.gate + 92, "Entry refused", "labelPosition=right;align=left;verticalLabelPosition=middle;verticalAlign=middle;labelWidth=90;");
flow("t21", "e_denied", { from: "b", to: "t" });

// Organiser monitoring (runs in parallel to sales and on event day)
vertex("ds", 900, CY.org, 120, 80, "<b>SmartTicket PDB</b><br><span style=\"font-size:9.5px\">16 tables + AUDIT_LOG<br>(written by lane above)</span>",
  "shape=datastore;whiteSpace=wrap;html=1;fontSize=10.5;fillColor=#E3F2FD;strokeColor=#1F5FA8;");
startEv("s_mon", 1090, CY.org, "Sales open /\nevent day", "conditional");
task("t22", 22, 1260, CY.org, "Monitor live dashboard", [["R", "BOOKINGS, PAYMENTS, TICKETS"], ["R", "GATE_SCANS, AUDIT_LOG"], ["R", "fn_occupancy_pct, pkg_reports"]], { code: "Power BI, DirectQuery", w: 196 });
flow("s_mon", "t22");
flow("ds", "t22", { dashed: true, from: [0.5, 0], to: [0.5, 0], pts: [[900, CY.org - 70], [1260, CY.org - 70]], label: "read-only data", lx: 0.35 });
gateway("g6", 1440, CY.org, "Action needed? (sell-out, fraud spike, slow gate)");
flow("t22", "g6");
task("t23", 23, 1620, CY.org, "Decide: open gates, release sections, flag a buyer", [], { w: 170 });
flow("g6", "t23", { label: "Yes" });
endEv("e_decided", 1780, CY.org, "Decision taken");
flow("t23", "e_decided");
flow("g6", "t22", { from: "b", to: "b", pts: [[1440, CY.org + 80], [1260, CY.org + 80]], label: "No: keep monitoring" });

// Legend
const legend =
  `<div style="text-align:left;font-size:10.5px;line-height:1.45">` +
  `<b>Data activities (task 4 of the brief)</b><br>` +
  `${tag("C", "Create: inserts a new record")}<br>` +
  `${tag("R", "Retrieve: reads or consults records")}<br>` +
  `${tag("U", "Update: changes an existing record (→ new status)")}<br>` +
  `<font color="${COL.D}"><b>D</b></font>&nbsp;Delete / archive: none. Records are never deleted; a cancelled or<br>&nbsp;&nbsp;&nbsp;&nbsp;expired booking only changes status, and AUDIT_LOG is append-only.<br>` +
  `Thick border = task that touches data. ORA-200xx = error raised by PL/SQL.<br>` +
  `Solid arrow = sequence flow; labels show the information passed.<br>Dashed arrow = read-only information flow (data association).</div>`;
vertex("legend", 2600, CY.org, 470, 170, legend, "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#999999;spacing=8;");

// Title
cells.unshift({
  kind: "free", id: "title", x: X0, y: 4, w: POOL_W, h: 56,
  value: `<b style="font-size:20px">SmartTicket: Ticket Booking, Payment and Gate Admission</b><br><span style="font-size:12px">BPMN 2.0 process model with swimlanes · INSY 8311 Capstone Phase I · FUMBA Huriro (25401)</span>`,
  style: "text;html=1;align=left;verticalAlign=middle;whiteSpace=wrap;",
});

// ---------- XML ----------
const out = [];
out.push(`<mxCell id="0"/>`, `<mxCell id="1" parent="0"/>`);
for (const c of cells.filter(c => c.kind === "free"))
  out.push(`<mxCell id="${c.id}" value="${esc(c.value)}" style="${c.style}" vertex="1" parent="1"><mxGeometry x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" as="geometry"/></mxCell>`);
out.push(`<mxCell id="pool" value="SmartTicket: booking to admission" style="swimlane;html=1;childLayout=stackLayout;resizeParent=1;resizeParentMax=0;horizontal=0;startSize=${POOL_HDR};horizontalStack=0;fontSize=12;fillColor=#E0E0E0;" vertex="1" parent="1"><mxGeometry x="${X0}" y="${Y0}" width="${POOL_W}" height="${POOL_H}" as="geometry"/></mxCell>`);
for (const l of LANES)
  out.push(`<mxCell id="${l.id}" value="${esc(l.name).replace(/\n/g, "&#xa;")}" style="swimlane;html=0;horizontal=0;startSize=${LANE_HDR};whiteSpace=wrap;fontSize=12;fontStyle=1;fillColor=${l.fill};swimlaneFillColor=${l.fill};strokeColor=#888888;" vertex="1" parent="pool"><mxGeometry x="${POOL_HDR}" y="${l.y - Y0}" width="${POOL_W - POOL_HDR}" height="${l.h}" as="geometry"/></mxCell>`);
for (const c of cells.filter(c => c.kind === "v"))
  out.push(`<mxCell id="${c.id}" value="${esc(c.value).replace(/\n/g, "&lt;br&gt;")}" style="${c.style}" vertex="1" parent="${c.lane}"><mxGeometry x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" as="geometry"/></mxCell>`);
for (const c of cells.filter(c => c.kind === "e")) {
  const pts = c.pts.length ? `<Array as="points">${c.pts.map(([px, py]) => `<mxPoint x="${px}" y="${py}"/>`).join("")}</Array>` : "";
  out.push(`<mxCell id="${c.id}" value="${esc(c.value)}" style="${c.style}" edge="1" parent="1" source="${c.src}" target="${c.tgt}"><mxGeometry x="${c.lx}" y="${c.ly}" relative="1" as="geometry">${pts}</mxGeometry></mxCell>`);
}
const model = `<mxGraphModel dx="1600" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="3300" pageHeight="1300" math="0" shadow="0"><root>${out.join("")}</root></mxGraphModel>`;
const diagramName = "Booking to admission";
const file = `<mxfile host="app.diagrams.net" agent="SmartTicket phase1 generator"><diagram id="smartticket-bpmn" name="${diagramName}">${model}</diagram></mxfile>`;
fs.writeFileSync(OUT, file);

// draw.io published-link format: #R + base64(rawDeflate(encodeURIComponent(xml)))
const packed = zlib.deflateRawSync(Buffer.from(encodeURIComponent(file), "utf8"), { level: 9 }).toString("base64");
const link = `https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&highlight=0000ff&edit=_blank&layers=1&nav=1&title=SmartTicket_business_process.drawio#R${encodeURIComponent(packed)}`;
console.log(link);

if (RENDER) {
  const cfg = { highlight: "#0000ff", nav: false, resize: false, toolbar: "", zoom: Number(ZOOM), xml: file };
  fs.writeFileSync(RENDER, `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: 420mm 200mm; margin: 5mm; } html,body{margin:0;background:#fff}
</style></head><body><div class="mxgraph" data-mxgraph="${esc(JSON.stringify(cfg))}"></div>
<script src="https://viewer.diagrams.net/js/viewer-static.min.js"></script></body></html>`);
}

// ---------- BPMN 2.0 XML export (bpmn.io) ----------
if (BPMN_OUT) {
  const x = s => esc(String(s)).replace(/\n/g, "&#10;");
  const LANE_NAMES = {
    lane_customer: "Customer (ticket buyer)", lane_db: "SmartTicket Database (Oracle PDB, PL/SQL)",
    lane_pay: "Payment Provider (MoMo / card)", lane_gate: "Gate Staff (venue entry)", lane_org: "Event Organiser (Power BI)",
  };
  const PLAIN_LEGEND = "Data activities: C = create a record, R = retrieve / read, U = update (new status). " +
    "D = delete / archive: none. Records are never deleted; cancelled or expired rows only change status and AUDIT_LOG is append-only. " +
    "ORA-200xx = error raised by PL/SQL. Labels on arrows show the information passed.";
  META.bt_timer = { type: "boundaryEvent", attachedTo: "t8", name: "15 min" };
  META.ds = { type: "dataStoreReference", name: "SmartTicket PDB (16 tables + AUDIT_LOG)" };

  // bpmn-js draws task names at 12px: make tasks tall enough for their lines
  const shape = {};
  for (const [id, v] of Object.entries(V)) {
    let { x: sx, y: sy, w, h } = v;
    const m = META[id];
    if (m && m.type === "task") {
      if (m.data && w >= 176) { w += 20; sx -= 10; }
      const lines = m.name.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length * 7 / (w - 16))), 0);
      const nh = Math.max(h, 18 + lines * 15);
      sy = v.cy - nh / 2; h = nh;
    }
    shape[id] = { x: sx, y: sy, w, h };
  }
  const port = (id, fx, fy) => [shape[id].x + fx * shape[id].w, shape[id].y + fy * shape[id].h];
  const edges = cells.filter(c => c.kind === "e");
  // waypoints: source port, bends, target port (bends that line up with a port are snapped to keep segments straight)
  const way = e => {
    const a = port(e.src, e.ex, e.ey), b = port(e.tgt, e.nx, e.ny);
    const pts = e.pts.map(p => [...p]);
    if (pts.length) {
      const L = pts.length - 1;
      if (e.ey === 0 || e.ey === 1) pts[0][0] = a[0]; else pts[0][1] = a[1];
      if (e.ny === 0 || e.ny === 1) pts[L][0] = b[0]; else pts[L][1] = b[1];
    }
    return [a, ...pts, b];
  };
  const labelAt = (wp, text) => {
    let best = 0, bi = 0;
    for (let i = 0; i < wp.length - 1; i++) { const d = Math.hypot(wp[i + 1][0] - wp[i][0], wp[i + 1][1] - wp[i][1]); if (d > best) { best = d; bi = i; } }
    const mx = (wp[bi][0] + wp[bi + 1][0]) / 2, my = (wp[bi][1] + wp[bi + 1][1]) / 2;
    const w = Math.max(24, text.length * 6), vertical = Math.abs(wp[bi][0] - wp[bi + 1][0]) < 1;
    const left = text === "payment failed"; // task 12 sits just right of this arrow
    return vertical ? [left ? mx - w - 4 : mx + 4, my - 7, w, 14] : [mx - w / 2, my - 17, w, 14];
  };

  const sf = edges.filter(e => !e.dashed), da = edges.filter(e => e.dashed);
  const inc = {}, out = {};
  for (const e of sf) { (out[e.src] ||= []).push(e.id); (inc[e.tgt] ||= []).push(e.id); }
  const io = id => (inc[id] || []).map(f => `<bpmn:incoming>${f}</bpmn:incoming>`).join("") + (out[id] || []).map(f => `<bpmn:outgoing>${f}</bpmn:outgoing>`).join("");
  const KIND = { lane_customer: "userTask", lane_gate: "userTask", lane_org: "userTask", lane_db: "serviceTask", lane_pay: "task" };

  const proc = [];
  for (const [id, m] of Object.entries(META)) {
    const doc = m.doc ? `<bpmn:documentation>${x(m.doc)}</bpmn:documentation>` : "";
    if (m.type === "task") {
      const t = KIND[V[id].lane.id];
      const dIn = da.filter(e => e.tgt === id);
      const props = dIn.length ? `<bpmn:property id="${id}_in" name="__targetRef_placeholder"/>` : "";
      const assoc = dIn.map(e => `<bpmn:dataInputAssociation id="${e.id}"><bpmn:sourceRef>${e.src}</bpmn:sourceRef><bpmn:targetRef>${id}_in</bpmn:targetRef></bpmn:dataInputAssociation>`).join("");
      proc.push(`<bpmn:${t} id="${id}" name="${x(m.name)}">${doc}${io(id)}${props}${assoc}</bpmn:${t}>`);
    } else if (m.type === "startEvent") {
      const def = m.symbol === "timer" ? `<bpmn:timerEventDefinition id="${id}_def"><bpmn:timeCycle xsi:type="bpmn:tFormalExpression">R/PT1M</bpmn:timeCycle></bpmn:timerEventDefinition>`
        : m.symbol === "conditional" ? `<bpmn:conditionalEventDefinition id="${id}_def"><bpmn:condition xsi:type="bpmn:tFormalExpression">sales are open or it is event day</bpmn:condition></bpmn:conditionalEventDefinition>` : "";
      proc.push(`<bpmn:startEvent id="${id}" name="${x(m.name)}">${io(id)}${def}</bpmn:startEvent>`);
    } else if (m.type === "endEvent") {
      proc.push(`<bpmn:endEvent id="${id}" name="${x(m.name)}">${io(id)}</bpmn:endEvent>`);
    } else if (m.type === "exclusiveGateway") {
      proc.push(`<bpmn:exclusiveGateway id="${id}" name="${x(m.name)}">${io(id)}</bpmn:exclusiveGateway>`);
    } else if (m.type === "boundaryEvent") {
      proc.push(`<bpmn:boundaryEvent id="${id}" name="${x(m.name)}" attachedToRef="${m.attachedTo}">${io(id)}<bpmn:timerEventDefinition id="${id}_def"><bpmn:timeDuration xsi:type="bpmn:tFormalExpression">PT15M</bpmn:timeDuration></bpmn:timerEventDefinition></bpmn:boundaryEvent>`);
    } else if (m.type === "dataStoreReference") {
      proc.push(`<bpmn:dataStoreReference id="${id}" name="${x(m.name)}"/>`);
    }
  }
  for (const e of sf) proc.push(`<bpmn:sequenceFlow id="${e.id}" sourceRef="${e.src}" targetRef="${e.tgt}"${e.value ? ` name="${x(e.value)}"` : ""}/>`);
  proc.push(`<bpmn:textAnnotation id="legend"><bpmn:text>${x(PLAIN_LEGEND)}</bpmn:text></bpmn:textAnnotation>`);
  const laneSet = LANES.map(l => `<bpmn:lane id="${l.id}" name="${x(LANE_NAMES[l.id])}">` +
    Object.keys(META).filter(id => META[id].type !== "dataStoreReference" && V[id].lane.id === l.id).map(id => `<bpmn:flowNodeRef>${id}</bpmn:flowNodeRef>`).join("") + `</bpmn:lane>`).join("");

  const col = (stroke, fill) => ` bioc:stroke="${stroke}" bioc:fill="${fill}" color:border-color="${stroke}" color:background-color="${fill}"`;
  const di = [];
  di.push(`<bpmndi:BPMNShape id="pool_di" bpmnElement="pool" isHorizontal="true"><dc:Bounds x="${X0}" y="${Y0}" width="${POOL_W}" height="${POOL_H}"/></bpmndi:BPMNShape>`);
  for (const l of LANES) di.push(`<bpmndi:BPMNShape id="${l.id}_di" bpmnElement="${l.id}" isHorizontal="true"${col("#555555", l.fill)}><dc:Bounds x="${X0 + POOL_HDR}" y="${l.y}" width="${POOL_W - POOL_HDR}" height="${l.h}"/></bpmndi:BPMNShape>`);
  for (const [id, m] of Object.entries(META)) {
    const b = shape[id];
    let c = "";
    if (m.type === "task") c = m.data ? col("#1F1F1F", "#FFFFFF") : col("#666666", "#FFFFFF");
    if (m.type === "startEvent") c = col("#2E7D32", "#E8F5E9");
    if (m.type === "endEvent") c = col("#B71C1C", "#FFEBEE");
    if (m.type === "exclusiveGateway") c = col("#8D6E00", "#FFFDE7");
    if (m.type === "dataStoreReference") c = col("#1F5FA8", "#E3F2FD");
    let lab = "";
    if (m.type === "exclusiveGateway") lab = `<bpmndi:BPMNLabel><dc:Bounds x="${b.x - 50}" y="${b.y - 44}" width="${b.w + 100}" height="40"/></bpmndi:BPMNLabel>`;
    else if (m.type === "startEvent" || m.type === "endEvent") lab = m.right
      ? `<bpmndi:BPMNLabel><dc:Bounds x="${b.x + b.w + 4}" y="${b.y + 4}" width="90" height="28"/></bpmndi:BPMNLabel>`
      : `<bpmndi:BPMNLabel><dc:Bounds x="${b.x - 32}" y="${b.y + b.h + 4}" width="${b.w + 64}" height="28"/></bpmndi:BPMNLabel>`;
    di.push(`<bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}"${c}><dc:Bounds x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>${lab}</bpmndi:BPMNShape>`);
  }
  const lg = V.legend;
  di.push(`<bpmndi:BPMNShape id="legend_di" bpmnElement="legend"><dc:Bounds x="${lg.x}" y="${lg.y + 30}" width="${lg.w}" height="100"/></bpmndi:BPMNShape>`);
  for (const e of edges) {
    const wp = way(e);
    const lab = e.value && !e.dashed ? (([lx, ly, lw, lh]) => `<bpmndi:BPMNLabel><dc:Bounds x="${Math.round(lx)}" y="${Math.round(ly)}" width="${Math.round(lw)}" height="${lh}"/></bpmndi:BPMNLabel>`)(labelAt(wp, e.value)) : "";
    di.push(`<bpmndi:BPMNEdge id="${e.id}_di" bpmnElement="${e.id}">${wp.map(([px, py]) => `<di:waypoint x="${Math.round(px)}" y="${Math.round(py)}"/>`).join("")}${lab}</bpmndi:BPMNEdge>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" xmlns:color="http://www.omg.org/spec/BPMN/non-normative/color/1.0" id="smartticket_defs" targetNamespace="https://github.com/fumbaking/fumba_25401_smartTicket" exporter="SmartTicket phase1 generator" exporterVersion="1.0">
<bpmn:collaboration id="collab"><bpmn:documentation>SmartTicket: ticket booking, payment and gate admission. INSY 8311 Capstone Phase I, FUMBA Huriro (25401).</bpmn:documentation><bpmn:participant id="pool" name="SmartTicket: booking to admission" processRef="booking_to_admission"/></bpmn:collaboration>
<bpmn:process id="booking_to_admission" name="Ticket booking, payment and gate admission" isExecutable="false"><bpmn:laneSet id="lanes">${laneSet}</bpmn:laneSet>
${proc.join("\n")}
</bpmn:process>
<bpmndi:BPMNDiagram id="diagram"><bpmndi:BPMNPlane id="plane" bpmnElement="collab">
${di.join("\n")}
</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
  fs.writeFileSync(BPMN_OUT, xml);
}
