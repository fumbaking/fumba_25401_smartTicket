# Dataset Card: SeatGeek Events & Ticket Listings (free sample)

**Project:** SmartTicket, Smart Event Ticketing System · **Student:** FUMBA Huriro (25401) · **Phase:** II, Data Sourcing, Normalisation and Logical Design

## 1. Source

| Item | Value |
|---|---|
| Dataset | SeatGeek Events & Ticket Listings Dataset (free sample) |
| Publisher | Rebrowser |
| Source links | https://huggingface.co/datasets/rebrowser/seatgeek-dataset · https://www.kaggle.com/datasets/rebrowser/seatgeek-dataset |
| Licence | CC BY-NC 4.0: free for non-commercial (educational) use with attribution |
| Format | CSV (UTF-8, comma-separated, values in double quotes) plus JSON schema files. Some fields hold **nested lists stored as text**: `performerIds` is a JSON array (`[2116,2110]`), `seats` is a Python-style list (`['4','5','6']`) and `splitType` is a comma list (`1,3`). |
| Snapshot period | 27 Sep 2026 to 26 Oct 2026 (one file per day) |
| Date collected (downloaded) | 10 Nov 2026 |
| Location in repo | `data/raw/` holds the files **exactly as downloaded and never edited**. `data/events_all.csv` and `data/event_listings_all.csv` are plain concatenations of the daily files, with no values changed. |

## 2. Size and what one record represents

| File | Rows | Columns | One record represents |
|---|---|---|---|
| `raw/venues.csv` | 194 | 19 | One venue (arena, stadium, park) with address, coordinates and capacity |
| `raw/performers.csv` | 265 | 21 | One team or artist |
| `raw/events/*.csv` (30 daily files; 15 contain only the header) | 1,397 (1,364 unique events) | 44 | One event **as seen in one daily snapshot** |
| `raw/event-listings/*.csv` (30 daily files × 1,000) | 30,000 | 19 | One **listing**: a block of seats for one event, in one section and row, offered for sale |
| **Total** | **31,856 records** | | Well above the 500-record minimum |

## 3. Personal data

There is **none**. Records describe venues, public sports teams and bands, events and seats. There is no buyer, seller, name, phone number, email or ID number, so nothing needs to be anonymised. Customers generated in Phase IV will use anonymous codes only (for example `CUST-000123`).

## 4. Data-quality report (counts, not fixed yet)

The counts were measured over `data/raw/` on 20 Nov 2026. Per the Phase II rules, **nothing has been fixed**: each issue becomes a Phase IV cleaning task.

### 4.1 Duplicates and keys

| Check | Count |
|---|---|
| Event rows repeated across daily snapshots (same `eventId`) | **33** duplicate rows (1,397 rows → 1,364 events). All 33 have identical values. |
| Duplicate `listingId` / `venueId` / `performerId` | 0 / 0 / 0 |
| **Same seat (event + section + row + seat) in two different listings** | **190** seat positions. This is the double-sale problem SmartTicket prevents. |
| Two spellings of one venue section (for example venue 129: `Section 122` / `Section C 122`; venue 93: `Section 224` / `Section 224 Uwc`) | **7** venue sections |

### 4.2 Broken references (orphans)

| Check | Count |
|---|---|
| Listings whose `eventId` is not in the events files | **5,421** listings, covering 42 events |
| Events whose `venueId` is not in `venues.csv` | 0 |
| Event → performer links (`performerIds`) to unknown performers | 0 of 2,845 links |
| Performers whose `homeVenueId` is not in `venues.csv` (Iowa Cubs → 81, Minnesota Golden Gophers Baseball → 207417) | **2** |

### 4.3 Missing and locked values

| Check | Count |
|---|---|
| Price fields locked as `[PREMIUM]`: `price`, `priceWithFees`, `fee`, `dealScore` | 30,000 of 30,000 listings (100%) |
| Event statistics locked as `[PREMIUM]` (`averagePrice`, `lowestPrice`, `highestPrice`, `medianPrice`, `lowestSgBasePrice`, `listingCount`, `ticketCount`, `eventScore`, `popularityScore`) | 1,397 of 1,397 rows for all 9 fields |
| Performer images locked as `[PREMIUM]` | 265 of 265 |
| **Listings with an empty seat list `[]`** (the seller hides seat numbers) | **26,158** of 30,000 (87%). Only 3,842 listings name their seats, giving 14,335 seats. |
| Events without an end time (`endDatetimeUtc`) | 202 rows |
| Events with time "to be decided" (`timeTbd = true`) / date TBD (`dateTbd = true`) | 205 / 38 rows |
| Listings without `inHandDate` | 262 |
| Venues with capacity `0` | **52** (8 of the 80 venues used by events) |
| Venues missing street / state / postal code / country | 7 / 6 / 6 / 2 |
| Performers missing `homeVenueId` / colours / division | 121 / 133 / 141 |
| Performers missing `taxonomySubName` (the 7 bands) | 7 |

### 4.4 Inconsistent values

| Check | Count |
|---|---|
| Country stored partly as a code and partly as a name: `US` 174, `UK` 2, but `Canada` 12, `Germany` 2, `Spain` 1, `Mexico` 1 | 2 formats in 192 venues |
| One league type spelled several ways in `performers.type`: `mlb` 50, `baseball` 25, `minor_league_baseball` 6, `ncaa_baseball` 2; and `nba` 50 vs `basketball` 2 | 6 spellings for 2 sports |
| `datetimeTbd` disagrees with `dateTbd OR timeTbd` | 167 event rows |
| Event that ends before it starts (18478230: start 2026-12-08 08:30, end 03:00) | 1 |
| Placeholder section name `This IS General Admission Ignore Row Seat Names` | 2 listings |
| `seatSelectionEnabled` is simply the opposite of `isGa` | 1,383 of 1,397 rows (redundant) |

### 4.5 Types stored as text

| Check | Count |
|---|---|
| Dates and times stored as text `YYYY-MM-DD HH:MI:SS`, UTC, with no time-zone marker | 7 fields (6 in events, `inHandDate` in listings), plus the `_firstSeenAt` / `_lastSeenAt` crawl stamps in every file |
| Booleans stored as text `"true"` / `"false"` | 11 event fields, 1 performer field (`isEvent`) |
| Lists stored inside one text field (`performerIds`, `seats`, `splitType`) | 3 fields (all rows) |
| Row labels that are not numbers (`a`, `wcc`, `sro`, `bb` …), so `row` must stay text | 9,770 listings |
| Ids quoted as text in listings (`"18478231"`) but plain numbers in events | `eventId` in 30,000 listings |

### 4.6 What remains usable (for planning Phase IV)

- **24,579 listings** belong to known events.
- **2,941** of these listings name their seats: **11,319 seats**, which become **11,129 unique seat positions** after removing the 190 double-listed seats.
- **1,818** distinct venue sections and **2,845** event–performer links.

## 5. Known limitations

1. **Prices are locked**, so prices come from four Kigali-style tiers (VIP 100,000 · Premium 50,000 · Silver 30,000 · Bronze 15,000 RWF, based on Ticqet / BK Arena 2025) stored in `PRICE_TIERS` and `EVENT_PRICES`.
2. **There are no buyers or bookings.** Customers, bookings, payments and gate scans will be generated in Phase IV and marked as test data.
3. **The data is mostly US sport.** The design (venue → section → seat → event) is generic and works for BK Arena, Amahoro Stadium or KCC.
