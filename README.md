# SmartTicket — Smart Event Ticketing System

**Oracle PL/SQL Capstone Project · INSY 8311 Database Development with PL/SQL**

| | |
|---|---|
| **Student** | FUMBA Huriro |
| **Student ID** | 25401 |
| **Institution** | Adventist University of Central Africa (AUCA), Faculty of IT |
| **Instructor** | Eric Maniraguha |
| **Academic year** | 2026–2027, Semester I |
| **Repository** | https://github.com/fumbaking/fumba_25401_smartTicket |
| **Current phase** | Phase 0: Research, Data Source and Project Proposal |

---

## 1. Problem statement

Rwanda's events sector is growing fast. MICE revenue reached **US$95 million in 2023, 48% more than in 2022** (Kagina, 2024), and venues such as BK Arena, Amahoro Stadium and the Kigali Convention Centre now host concerts, matches and conferences every month. Ticketing has not kept up:

- **Scalping and bulk buying.** Brokers buy many cheap seats early and resell them at higher prices (Courty, 2003). This rent-seeking wastes about a third of the efficiency gain that resale can create (Leslie & Sorensen, 2014).
- **Fake and duplicate tickets.** The same seat can be sold twice, or a screenshot of one QR code can be used by several people at the gate (Rafati Niya et al., 2022).
- **No transparency.** Local platforms are closed products. Organisers see only total sales, not live occupancy, denied fraud attempts or an audit trail of who changed what.

There is no open, rule-enforcing database that guarantees **one seat → one sale → one entry** and reports it live.

## 2. Objectives

**Main objective:** design and implement an Oracle database with PL/SQL that sells, validates and reports event tickets in real time, and that prevents double sales, scalping and fraudulent entry.

**Specific objectives**
1. Normalise the real SeatGeek events dataset into 3NF tables and load **1,364 events, 194 venues and 30,000 seat records**.
2. Build a PL/SQL package that **books, pays for and cancels** tickets, with full exception handling.
3. Enforce anti-fraud business rules with **triggers**: no double sale, a maximum of 6 tickets per customer per event, single-use gate entry, and no booking after the event has started.
4. **Audit** every data change and every denied attempt, and apply the Phase VI weekday/holiday restriction rule.
5. Deliver a **live Power BI dashboard** connected to the Oracle PDB for organisers.

## 3. Data source

**SeatGeek Events & Ticket Listings Dataset** by Rebrowser (2026), **CC BY-NC 4.0** (educational use allowed), with no personal data.
Links: [Hugging Face](https://huggingface.co/datasets/rebrowser/seatgeek-dataset) · [Kaggle](https://www.kaggle.com/datasets/rebrowser/seatgeek-dataset)

| Entity | Records |
|---|---|
| Events | 1,364 unique (1,397 snapshot rows) |
| Seat listings | 30,000 |
| Venues (with capacity, coordinates) | 194 |
| Performers | 265 |

Details, sample records and known limitations are in [data/README.md](data/README.md).

## 4. Proposed solution

SmartTicket is an Oracle 19c+ pluggable database. **All business rules live in PL/SQL.** A sale succeeds only when the seat is free, the event is open, the buyer is under their limit and the payment matches. Each ticket can be scanned in only once. Every action, including refused ones, is written to an audit log, and Power BI reads the data live.

## 5. Planned tables

| # | Table | Purpose | Key relationships |
|---|---|---|---|
| 1 | `VENUES` | Venue, city, country, capacity, latitude/longitude | 1 venue → many sections, events |
| 2 | `PRICE_TIERS` | VIP, Premium, Silver, Bronze | 1 tier → many sections |
| 3 | `SECTIONS` | Seating sections of a venue (e.g. "Section 211") | FK venue, FK tier |
| 4 | `PERFORMERS` | Teams and artists | M:N with events |
| 5 | `EVENTS` | Event name, category, start/end, status, sales window | FK venue |
| 6 | `EVENT_PERFORMERS` | Bridge table for the event ↔ performer M:N relationship | FK event, FK performer |
| 7 | `EVENT_PRICES` | Price in RWF per event and tier | FK event, FK tier |
| 8 | `TICKETS` | One row per seat per event: row, seat, status (AVAILABLE / HELD / SOLD / USED / CANCELLED) | FK event, FK section; UNIQUE (event, section, row, seat) |
| 9 | `CUSTOMERS` | Anonymous buyer code, region, registration date | 1 customer → many bookings |
| 10 | `BOOKINGS` | Booking header: customer, time, status, total | FK customer |
| 11 | `BOOKING_ITEMS` | Tickets in a booking, with price paid | FK booking, FK ticket (UNIQUE ticket) |
| 12 | `PAYMENTS` | MoMo / card / cash, amount, reference, status | FK booking |
| 13 | `GATE_SCANS` | Every scan at the gate: time, gate, result (ADMITTED / DENIED) | FK ticket |
| 14 | `PUBLIC_HOLIDAYS` | Dates used by the restriction rule | — |
| 15 | `AUDIT_LOG` | User, action, table, time, status (ALLOWED / DENIED), message | — |

## 6. Planned PL/SQL features (and where each is used)

**Procedures**
- `sp_book_tickets(p_customer, p_event, p_ticket_list)` puts the chosen seats on hold and creates a `PENDING` booking.
- `sp_record_payment(p_booking, p_method, p_amount)` confirms the booking only when the amount equals `fn_booking_total`, and marks the tickets `SOLD`.
- `sp_cancel_booking(p_booking)` releases seats back to `AVAILABLE` and marks the payment for refund.
- `sp_scan_ticket(p_ticket, p_gate)` admits a `SOLD` ticket once and sets it to `USED`.

**Functions**
- `fn_available_seats(p_event, p_tier)` returns the seats left, shown on the dashboard.
- `fn_booking_total(p_booking)` adds up the booking items' prices.
- `fn_occupancy_pct(p_event)` returns sold seats ÷ capacity.
- `fn_customer_ticket_count(p_customer, p_event)` is used by the anti-scalping trigger.

**Cursors**
- An explicit cursor in `sp_release_expired_holds` loops over `PENDING` bookings older than 15 minutes and cancels them, so unpaid holds do not block seats.
- `BULK COLLECT` with a parameterised cursor produces the per-event sales report.

**Packages**
- `pkg_ticketing`: booking, payment, cancellation and the custom exceptions
- `pkg_gate`: gate scanning and entry validation
- `pkg_reports`: analytics using window functions (`RANK` of events by revenue per venue, `LAG` for daily sales change, running totals)

**Triggers**
- `trg_no_double_sale` blocks adding a ticket to a booking unless the ticket is `AVAILABLE` or `HELD` by that booking.
- `trg_ticket_limit` (compound trigger) blocks a sale that would give one customer **more than 6 tickets for the same event**. This is the anti-scalping rule.
- `trg_event_open` blocks booking for an event that is `CANCELLED` or has already started.
- `trg_single_entry` blocks a second scan of a `USED` ticket and logs a `DENIED` attempt. This prevents shared or fake QR codes.
- `trg_restrict_dml` blocks INSERT/UPDATE/DELETE on weekdays and on dates in `PUBLIC_HOLIDAYS` (the Phase VI restriction rule).
- `trg_audit_*` (compound triggers) write every DML action to `AUDIT_LOG`. Denied actions are logged through an **autonomous transaction**, so the log entry survives the rollback.

**Exceptions** (user-defined, raised with `RAISE_APPLICATION_ERROR`)

| Code | Exception | Raised when |
|---|---|---|
| -20001 | `e_seat_unavailable` | The seat is already sold or held |
| -20002 | `e_limit_exceeded` | The customer would have more than 6 tickets for the event |
| -20003 | `e_event_closed` | The event is cancelled or has started |
| -20004 | `e_already_scanned` | The ticket has already been used at the gate |
| -20005 | `e_payment_mismatch` | The amount paid ≠ the booking total |
| -20010 | `e_restricted_day` | DML is attempted on a weekday or public holiday |

## 7. Innovation: live Power BI dashboard (Analytics dashboard option)

**Tool:** Power BI Desktop connected to the Oracle PDB in **DirectQuery** mode (built-in ODP.NET driver / Oracle Client for Microsoft Tools).

| Page | Shows |
|---|---|
| Sales overview | Revenue (RWF), tickets sold, sales by tier and category, daily trend |
| Event occupancy | Sold vs capacity per event, a venue map from latitude/longitude, events close to selling out |
| Gate & security | Admitted vs denied scans, denied scalping and double-sale attempts per day (from `AUDIT_LOG`) |

The dashboard only *reads* data. All rules are enforced by the PL/SQL procedures and triggers. It will be demonstrated live in Phase VII and documented in `innovation/`.

## 8. Repository structure

```
fumba_25401_smartTicket/
├── README.md
├── data/                 # real dataset (raw + merged CSVs) and data README
├── docs/
│   ├── research/         # research_log.md
│   ├── proposal/         # Phase 0 proposal (.docx and .pdf)
│   └── presentation/     # Phase 0 slides (.pptx and .pdf)
└── (later phases add: diagrams/, database/, scripts/, innovation/)
```

## 9. References

- Courty, P. (2003). Some economics of ticket resale. *Journal of Economic Perspectives, 17*(2), 85–97. https://doi.org/10.1257/089533003765888449
- Iyamuremye, J. (2025, November 14). The wait is over! Tickets for Davido's Kigali concert, sponsored by Skol Malt, are now on sale. *InyaRwanda*. https://inyarwanda.com/en/news/the-wait-is-over-tickets-for-davidos-kigali-concert-sponsored-by-skol-malt-are-now-on-sale-1763145382294
- Kagina, A. (2024, April 18). Rwanda's events industry rakes in $95m in 2023. *The New Times*. https://www.newtimes.co.rw/article/16078/news/economy/rwandas-events-industry-rakes-in-95m-in-2023
- Leslie, P., & Sorensen, A. (2014). Resale and rent-seeking: An application to ticket markets. *The Review of Economic Studies, 81*(1), 266–300.
- Microsoft. (2026). *Power Query Oracle database connector*. Microsoft Learn. https://learn.microsoft.com/en-us/power-query/connectors/oracle-database
- Oracle. (2026). *Oracle Database PL/SQL language reference, 19c* (E96448-09). https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/
- Rafati Niya, S., Bachmann, S., Brasser, C., Bucher, M., Spielmann, N., & Stiller, B. (2022). DeTi: A decentralized ticketing management platform. *Journal of Network and Systems Management, 30*, Article 52. https://doi.org/10.1007/s10922-022-09675-3
- Rebrowser. (2026). *SeatGeek events & ticket listings dataset* [Data set]. Hugging Face. https://huggingface.co/datasets/rebrowser/seatgeek-dataset
