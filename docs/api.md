# HolidayHub REST API

Base URL: `/api` (dev server: `http://localhost:5050/api`, proxied by Vite at `http://localhost:5173/api`).

All responses use one envelope:

```json
{ "success": true, "data": { } }
{ "success": false, "error": { "message": "Validation failed", "details": [{ "field": "email", "message": "…" }] } }
```

Status codes: `200/201` success · `400` validation / malformed JSON / invalid id · `404` not found · `409` duplicate · `413` body too large · `429` rate limited · `500` unexpected (message hidden in production).

## Endpoints

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | API + database status |
| GET | `/packages` | Public | Search, filter, sort, paginate published packages |
| GET | `/packages/facets` | Public | Counts by destination (with min price), category, theme |
| GET | `/packages/:id` | Public | Package by slug or ObjectId |
| GET | `/packages/:id/departures` | Public | Upcoming open departures (incl. sold out), soonest first |
| GET | `/packages/:id/related` | Public | Same destination first, then same category (`?limit=1..6`, default 3) |
| GET | `/departures/:id` | Public | `{ departure, package }` for the checkout entry page |
| POST | `/contact` | Public | Store a contact message (5 per IP / 10 min) |
| POST | `/auth/register` | Public | `{ name, email, phone?, password }` → `201 { user }` + session cookie; `409` duplicate email |
| POST | `/auth/login` | Public | `{ email, password }` → `{ user }` + cookie; `401 Invalid email or password`; 10 / 15 min per IP |
| POST | `/auth/logout` | Any | Clears the session cookie (idempotent) |
| GET | `/auth/me` | Any | `{ user }` or `{ user: null }` |
| PATCH | `/users/me` | Customer/Admin | `{ name?, phone? }` (`phone: ""` removes it); email and role are not editable |
| GET | `/admin/users` | Admin | Customers: `?q=&page=&limit=` → `{ items: [{ id, name, email, phone, role, createdAt }], total, page, pages }` |
| GET | `/admin/stats` | Admin | Package/booking counts by status, customers, upcoming departures, simulated revenue (paid demo bookings), 6-month series, top destinations, 5 recent bookings |
| GET | `/admin/packages` | Admin | All statuses; `?q=&status=&page=&limit=`; items include `departureCount`, `activeBookings` |
| GET | `/admin/packages/:id` | Admin | Any status (for editing) |
| POST | `/admin/packages` | Admin | Create (default `draft`); slug optional (derived from title), unique → `409` |
| PUT | `/admin/packages/:id` | Admin | Full update; slug is fixed after creation |
| DELETE | `/admin/packages/:id` | Admin | Archives if any booking references it, otherwise deletes it and its departures |
| GET | `/admin/departures?packageId=` | Admin | All departures incl. past, with `bookedSeats`, `activeBookings` |
| POST | `/admin/departures` | Admin | `{ packageId, startDate, capacity, pricePerPerson?, status? }`; future dates only; `endDate` from duration |
| PUT | `/admin/departures/:id` | Admin | Capacity ≥ booked seats (atomic); date change / cancel refused while active bookings exist; `pricePerPerson: null` reverts to base price |
| GET | `/admin/bookings` | Admin | `?q=` (reference, customer name/email, trip) `&status=&from=&to=` (departure date) `&page=&limit=`; includes `customer` |
| PATCH | `/admin/bookings/:id/status` | Admin | `{ status: 'cancelled' | 'completed' }` — cancel pending/confirmed (refund + seat release); complete confirmed trips that have started |

| POST | `/bookings/quote` | Customer/Admin | `{ departureId, travellerCount }` → server price `{ unitPrice, totalAmount, seatsRemaining, available, holdMinutes }` (no write) |
| POST | `/bookings` | Customer/Admin | `{ departureId, travellers: [{ name, age? }], idempotencyKey? }` → `201 { booking }` (pending, 15-min hold); same key → `200 { booking, replayed: true }`; `409` not enough seats |
| GET | `/bookings/my` | Customer/Admin | Own bookings; `?tab=upcoming|completed|cancelled` |
| GET | `/bookings/:id` | Owner/Admin | Booking + `payments[]`, `tab`, `cancellation { canCancel, deadline, cutoffDays }`; others get `404` |
| PATCH | `/bookings/:id/cancel` | Owner/Admin | Cancel per policy; paid → `refunded_demo` + refund record; seats released once |
| POST | `/payments/demo` | Booking owner | `{ bookingId, outcome?: 'success'|'decline' }` → `{ booking, payment, replayed }`; decline → `402`; expired hold → `409` |

Cookie-authenticated, state-changing requests must come from an allowed `Origin` (`403` otherwise). See [security.md](security.md).

### Booking lifecycle

```
quote ──► POST /bookings ──► pending/unpaid (seats reserved, hold 15 min)
                                 │            │                  │
                    POST /payments/demo   PATCH …/cancel     hold expires (sweep every 60 s)
                                 ▼            ▼                  ▼
                      confirmed/paid_demo   cancelled/unpaid   cancelled (hold_expired)
                                 │
                       PATCH …/cancel (≥ 7 days before start, or admin)
                                 ▼
                      cancelled/refunded_demo
```

Totals are always `travellers × (departure.pricePerPerson ?? package.basePrice)` computed on the server; client-sent prices are ignored.

### `GET /packages` query parameters

| Param | Type | Notes |
|---|---|---|
| `destination` | string ≤ 80 | Case-insensitive match on destination, country or title (regex characters are escaped) |
| `category` | enum | Adventure, Honeymoon, Family, Luxury, Budget, Weekend Getaways |
| `theme` | string | Matches a package tag, e.g. `romantic`, `mountains`, `tropical`, `culture` |
| `minPrice`, `maxPrice` | int ≥ 0 | On `basePrice` (per person, INR); `minPrice ≤ maxPrice` |
| `duration` | `1-3` · `4-5` · `6-` | Trip length buckets in days |
| `date` | `YYYY-MM-DD` | With/without `travellers`: only packages with a bookable departure starting within 30 days of `date` |
| `travellers` | 1–12 | Only packages with a departure that has at least this many seats |
| `featured` | `true`/`false` | |
| `sort` | `price-asc` · `price-desc` · `duration-asc` · `duration-desc` | Default: featured first |
| `page`, `limit` | int | `limit` 1–50 (default 12) |

Empty values (`?category=`) are ignored; invalid values return `400` with per-field details.

Response `data`: `{ items, total, page, limit, pages }`. Each item is a package plus
`departureSummary: { upcomingCount, next }` where `next` is the soonest open departure with enough seats for `travellers` (or `null`).

A **bookable departure** is `status: "open"`, starts after today (in `APP_TIMEZONE`) and has `seatsRemaining ≥ travellers`.

### `POST /contact` body

```json
{ "name": "2–80 chars", "email": "valid email", "subject": "optional, ≤120", "message": "10–2000 chars" }
```

Returns `201 { id, receivedAt }`.

