# Data Source

| Item | Value |
|------|-------|
| Dataset | SeatGeek Events & Ticket Listings Dataset (free sample) |
| Publisher | Rebrowser |
| Links | https://huggingface.co/datasets/rebrowser/seatgeek-dataset · https://www.kaggle.com/datasets/rebrowser/seatgeek-dataset |
| Licence | CC BY-NC 4.0: free for research and non-commercial (educational) use with attribution |
| Snapshot period | 27 Sep 2026 to 26 Oct 2026 (30 daily files) |
| Downloaded | 10 Nov 2026 |
| Personal data | None. Records describe events, venues, performers and seat listings. There are no buyer names, phone numbers or emails. |

## Files

| File | Records | Description |
|------|---------|-------------|
| `raw/venues.csv` | 194 | Venue name, city, state, country, latitude/longitude, **capacity** |
| `raw/performers.csv` | 265 | Teams and artists, with category and sub-category |
| `raw/events/*.csv` → `events_all.csv` | 1,397 rows (1,364 unique events) | Event name, type, start/end datetime, status, venue, performer IDs, category |
| `raw/event-listings/*.csv` → `event_listings_all.csv` | 30,000 | Seat listings: event, section, row, seat numbers, quantity, delivery type (`mobile_transfer` / `seatgeek_app`) |
| `raw/*_schema.json`, `raw/SOURCE_README.md` | — | Original schema and dataset card from the publisher |

## Sample records

**Events**

| eventId | name | datetimeUtc | venueId | category |
|---|---|---|---|---|
| 18014240 | Los Angeles Rams at Denver Broncos | 2026-09-28 00:20 | 1131 | sports / football |
| 18478250 | Los Angeles Lakers at Cleveland Cavaliers | 2027-03-25 23:00 | 120 | sports / basketball |
| 18665454 | AT&T Stadium VIP Guided Tour | 2026-12-30 20:00 | 4965 | sports / football |

**Venues**

| venueId | name | city | capacity |
|---|---|---|---|
| 136 | United Center | Chicago, IL | 20,917 |
| 134 | Crypto.com Arena | Los Angeles, CA | 18,997 |
| 7546 | Barclays Center | Brooklyn, NY | 17,732 |

**Seat listings**

| listingId | eventId | section | row | quantity | seats | delivery |
|---|---|---|---|---|---|---|
| 3q7fN7D3vXA | 18478231 | Section 211 | 8 | 4 | 7, 8, 9, 10 | seatgeek_app |
| LbviL6X2J0l | 18495581 | Section 121 | aa | 2 | — | mobile_transfer |

## Known limitations and how they are handled

1. **Prices are locked** (`[PREMIUM]`) in the free sample. Prices will be set per **price tier** (VIP, Premium, Silver, Bronze), modelled on real Kigali ticket tiers (Ticqet, BK Arena, 2025), and assigned to sections in Phase II.
2. **No buyer or booking data.** Customers (anonymous codes only), bookings, payments and gate scans will be generated in Phase IV on top of the real event, seat and venue catalogue. These generated tables will be clearly marked as test data.
3. **The data is mostly US sports.** The schema is generic (venue → section → seat → event), so the same design applies to BK Arena, Amahoro Stadium or KCC events.
4. Duplicate event rows across daily snapshots (1,397 rows for 1,364 events) will be removed during Phase II normalisation.
