# Data Dictionary (logical design)

**Project:** SmartTicket · **Student:** FUMBA Huriro (25401) · **Phase:** II, Data Sourcing, Normalisation and Logical Design

**Key:** PK = primary key, FK = foreign key. **Req.** = required (NOT NULL). **Unique** shows a unique column or a combination of columns. Oracle data types and sizes are left out on purpose; they are added in Phase IV. Columns marked *(raw: …)* come from the SeatGeek dataset; the rest are created by SmartTicket.

## Relationships (cardinality and optionality)

| Parent | Child | Cardinality | Optionality | Meaning |
|---|---|---|---|---|
| CATEGORIES | CATEGORIES | 1 : N | A category has 0..N sub-categories; a sub-category has 0..1 parent | Hierarchy, e.g. sports → basketball → nba |
| CATEGORIES | EVENTS | 1 : N | Each event has exactly 1 category; a category has 0..N events | |
| CATEGORIES | PERFORMERS | 1 : N | Each performer has exactly 1 category | |
| VENUES | EVENTS | 1 : N | Each event is held at exactly 1 venue; a venue hosts 0..N events | |
| VENUES | SECTIONS | 1 : N | Each section belongs to exactly 1 venue; a venue has 0..N sections | |
| VENUES | PERFORMERS | 1 : N | A performer has **0..1** home venue | Optional FK |
| PRICE_TIERS | SECTIONS | 1 : N | Each section is in exactly 1 tier | |
| EVENTS ↔ PERFORMERS | EVENT_PERFORMERS | M : N | Each event has 1..N performers; a performer plays 0..N events | Junction table |
| EVENTS ↔ PRICE_TIERS | EVENT_PRICES | M : N | An event has 0..N tier prices; a tier is priced for 0..N events | Junction table |
| EVENTS | TICKETS | 1 : N | Each ticket is for exactly 1 event; an event has 0..N tickets | |
| SECTIONS | TICKETS | 1 : N | Each ticket is in exactly 1 section | |
| CUSTOMERS | BOOKINGS | 1 : N | Each booking has exactly 1 customer; a customer has 0..N bookings | |
| BOOKINGS | BOOKING_ITEMS | 1 : N | A booking has **1..N** items; each item belongs to 1 booking | |
| TICKETS | BOOKING_ITEMS | 1 : N | A ticket appears in 0..N items over time, but in **at most one active booking** (`trg_no_double_sale`) | |
| BOOKINGS | PAYMENTS | 1 : N | A booking has 0..N payment attempts | |
| TICKETS | GATE_SCANS | 1 : N | A ticket has 0..N scans; at most one is ADMITTED (`trg_single_entry`) | |
| PUBLIC_HOLIDAYS, AUDIT_LOG | — | — | Stand-alone | Used by triggers |

---

## 1. CATEGORIES
Event and performer categories as a hierarchy.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| category_id | Category identifier | PK | Yes | Yes |
| category_code | Short code *(raw: `type`, `taxonomyName`, `taxonomySubName`)*, e.g. `nba`, `basketball`, `sports` | | Yes | Yes |
| category_name | Display name, e.g. "NBA" | | Yes | |
| parent_category_id | The broader category (NULL for top level) | FK → CATEGORIES | No | |

## 2. VENUES
Places where events are held.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| venue_id | Venue identifier *(raw: `venueId`)* | PK | Yes | Yes |
| venue_name | Venue name *(raw: `name`)* | | Yes | |
| street | Street address | | No | |
| city | City | | Yes | |
| state_region | State, province or region | | No | |
| country | ISO country code (US, CA, GB, RW …) | | No | |
| postal_code | Postal code, kept as text | | No | |
| time_zone | IANA time zone, e.g. America/Chicago | | Yes | |
| latitude | Latitude, used by the Power BI map | | Yes | |
| longitude | Longitude | | Yes | |
| capacity | Number of seats (NULL if unknown) | | No | |

## 3. PRICE_TIERS
Seat categories used for pricing.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| tier_id | Tier identifier | PK | Yes | Yes |
| tier_code | VIP, PREMIUM, SILVER, BRONZE | | Yes | Yes |
| tier_name | Display name | | Yes | |
| default_price_rwf | Default price in RWF (VIP 100,000 · Premium 50,000 · Silver 30,000 · Bronze 15,000) | | Yes | |
| tier_rank | Order from best (1) to cheapest (4) | | Yes | Yes |

## 4. SECTIONS
Seating sections of a venue.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| section_id | Section identifier | PK | Yes | Yes |
| venue_id | Venue the section belongs to | FK → VENUES | Yes | (venue_id, section_code) |
| section_code | Section code *(raw: `section`)*, e.g. 109, 102F | | Yes | (venue_id, section_code) |
| section_name | Full name *(raw: `sectionFull`)*, e.g. "102 Floor" | | Yes | |
| tier_id | Price tier of the section | FK → PRICE_TIERS | Yes | |

## 5. PERFORMERS
Teams and artists.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| performer_id | Performer identifier *(raw: `performerId`)* | PK | Yes | Yes |
| performer_name | Full name, e.g. "Los Angeles Lakers" | | Yes | |
| short_name | Short name, e.g. "Lakers" | | Yes | |
| category_id | Category *(raw: `type`)* | FK → CATEGORIES | Yes | |
| home_venue_id | Home venue, if any | FK → VENUES | No | |

## 6. EVENTS
Matches, concerts and tours that sell tickets.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| event_id | Event identifier *(raw: `eventId`)* | PK | Yes | Yes |
| category_id | Event category *(raw: `type`)* | FK → CATEGORIES | Yes | |
| venue_id | Venue | FK → VENUES | Yes | |
| event_name | Full name *(raw: `name`)* | | Yes | |
| short_name | Short name *(raw: `shortName`)* | | Yes | |
| start_datetime_utc | Start date and time (UTC) | | Yes | |
| end_datetime_utc | End date and time (UTC) | | No | |
| date_tbd | Y if the date is not final | | Yes | |
| time_tbd | Y if the time is not final | | Yes | |
| is_general_admission | Y if seats are not numbered *(raw: `isGa`)* | | Yes | |
| announced_on | Date the event was announced | | No | |
| sales_open_at | When ticket sales open *(raw: `visibleAt`)* | | Yes | |
| sales_close_at | When ticket sales close *(raw: `visibleUntilUtc`)* | | Yes | |
| status | SCHEDULED, POSTPONED, CANCELLED, COMPLETED | | Yes | |
| is_rescheduled | Y if the event was moved *(raw: `scheduleStatus`)* | | Yes | |

## 7. EVENT_PERFORMERS
Junction table: which performers appear at which event.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| event_id | Event | PK, FK → EVENTS | Yes | (event_id, performer_id) |
| performer_id | Performer *(raw: one id from `performerIds`)* | PK, FK → PERFORMERS | Yes | (event_id, performer_id) |

## 8. EVENT_PRICES
Junction table: the price of each tier for each event.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| event_id | Event | PK, FK → EVENTS | Yes | (event_id, tier_id) |
| tier_id | Price tier | PK, FK → PRICE_TIERS | Yes | (event_id, tier_id) |
| price_rwf | Ticket price in RWF for this event and tier | | Yes | |

## 9. TICKETS
One sellable seat for one event.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| ticket_id | Ticket identifier (also encoded in the QR code) | PK | Yes | Yes |
| event_id | Event the seat is for | FK → EVENTS | Yes | (event_id, section_id, row_label, seat_no) |
| section_id | Section (must belong to the event's venue) | FK → SECTIONS | Yes | (event_id, section_id, row_label, seat_no) |
| row_label | Row *(raw: `row`)*, may contain letters | | Yes | (event_id, section_id, row_label, seat_no) |
| seat_no | Seat number *(raw: one value from `seats`)* | | Yes | (event_id, section_id, row_label, seat_no) |
| delivery_type | APP or MOBILE_TRANSFER *(raw: `deliveryType`)* | | Yes | |
| status | AVAILABLE, HELD, SOLD, USED, CANCELLED | | Yes | |

## 10. CUSTOMERS
Ticket buyers (anonymous; no names or phone numbers).

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| customer_id | Customer identifier | PK | Yes | Yes |
| customer_code | Anonymous code, e.g. CUST-000123 | | Yes | Yes |
| region | Province or region of the buyer | | No | |
| registered_at | Date and time of registration | | Yes | |

## 11. BOOKINGS
A customer's order (header).

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| booking_id | Booking identifier | PK | Yes | Yes |
| customer_id | Buyer | FK → CUSTOMERS | Yes | |
| booked_at | When the seats were held | | Yes | |
| hold_expires_at | When an unpaid hold is released (booked_at + 15 min) | | Yes | |
| status | PENDING, CONFIRMED, CANCELLED, EXPIRED | | Yes | |

The booking total is not stored. `fn_booking_total` computes it from `BOOKING_ITEMS`.

## 12. BOOKING_ITEMS
One ticket inside a booking.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| booking_item_id | Item identifier | PK | Yes | Yes |
| booking_id | Booking | FK → BOOKINGS | Yes | (booking_id, ticket_id) |
| ticket_id | Ticket (seat) | FK → TICKETS | Yes | (booking_id, ticket_id) |
| price_paid_rwf | Price at the moment of sale | | Yes | |

## 13. PAYMENTS
Payment attempts for a booking.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| payment_id | Payment identifier | PK | Yes | Yes |
| booking_id | Booking paid for | FK → BOOKINGS | Yes | |
| method | MOMO, CARD, CASH | | Yes | |
| amount_rwf | Amount paid in RWF | | Yes | |
| payment_reference | Transaction reference from MoMo or the card provider | | Yes | Yes |
| status | PENDING, COMPLETED, FAILED, REFUND_PENDING, REFUNDED | | Yes | |
| paid_at | Date and time of the payment | | Yes | |

## 14. GATE_SCANS
Every scan of a ticket at the gate.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| scan_id | Scan identifier | PK | Yes | Yes |
| ticket_id | Ticket scanned | FK → TICKETS | Yes | |
| gate_code | Gate, e.g. GATE-A | | Yes | |
| scanned_at | Date and time of the scan | | Yes | |
| scan_result | ADMITTED or DENIED | | Yes | |
| denial_reason | Why entry was refused, e.g. ALREADY_USED | | No | |

## 15. PUBLIC_HOLIDAYS
Dates used by the weekday/holiday restriction rule (Phase VI).

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| holiday_date | Date of the holiday | PK | Yes | Yes |
| holiday_name | Name, e.g. "Liberation Day" | | Yes | |

## 16. AUDIT_LOG
Every data change and every denied attempt.

| Column | Meaning | Key | Req. | Unique |
|---|---|---|---|---|
| audit_id | Audit entry identifier | PK | Yes | Yes |
| db_user | Database user who acted | | Yes | |
| action_type | INSERT, UPDATE, DELETE, BOOK, PAY, SCAN … | | Yes | |
| table_name | Table affected | | Yes | |
| record_key | Key of the affected row | | No | |
| action_time | Date and time of the action | | Yes | |
| action_status | ALLOWED or DENIED | | Yes | |
| message | Details or error message (e.g. ORA-20002 limit exceeded) | | No | |
