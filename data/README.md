# Data

| Path | Contents |
|---|---|
| [dataset_card.md](dataset_card.md) | Source, licence, format, size, date collected, what one record represents, and the **data-quality report** (Phase II) |
| `raw/` | The SeatGeek files **exactly as downloaded on 10 Nov 2026**. Never edited. |
| `events_all.csv`, `event_listings_all.csv` | Plain concatenations of the 30 daily files in `raw/events/` and `raw/event-listings/`, with no values changed |

The normalised design built from this data is in [../docs/design/](../docs/design/).
