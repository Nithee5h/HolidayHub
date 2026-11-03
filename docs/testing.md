# Testing

```bash
cd server && npm test   # supertest + mongodb-memory-server (real MongoDB, in memory)
cd client && npm test   # Vitest + React Testing Library (jsdom); API services mocked
```

Both suites also run ESLint via `npm run lint`. Browser checks (Chrome, 360/768/1440 px, console errors, horizontal overflow, reduced motion) were run manually with headless Chrome during each phase.

## Required test scenarios → automated tests

| # | Scenario | Where |
|---|---|---|
| 1 | Homepage → listings → details | `client/src/App.test.jsx`, `pages/Packages.test.jsx` |
| 2 | Search “Kerala”; clear filters | `server/test/catalog.test.js`, `client/src/pages/Packages.test.jsx` |
| 3 | Mobile nav open/close, keyboard | `client/src/components/layout/Navbar.test.jsx` |
| 4 | Register rejects bad email, weak password, duplicate | `server/test/auth.test.js`, `client/src/pages/Auth.test.jsx` |
| 5 | Login rejects invalid, allows valid | `server/test/auth.test.js`, `client/src/pages/Auth.test.jsx` |
| 6 | Customer can't use admin API or others' bookings | `server/test/auth.test.js`, `server/test/booking.test.js` |
| 7 | Admin creates/publishes package + departure | `server/test/admin.test.js`, `client/src/pages/admin/Admin.test.jsx` |
| 8 | 2 travellers = 2 × server price | `server/test/booking.test.js`, `client/src/pages/Booking.test.jsx` |
| 9 | Too many seats fails, no negative inventory | `server/test/booking.test.js` |
| 10 | Concurrent last-seat requests never oversell | `server/test/booking.test.js` (8 parallel requests) |
| 11 | Demo payment marks demo-paid | `server/test/booking.test.js` |
| 12 | Repeated payment → one charge record | `server/test/booking.test.js` |
| 13 | Cancellation updates history, releases seats | `server/test/booking.test.js`, `client/src/pages/Booking.test.jsx` |
| 14 | Empty / loading / API-failure states | `Packages.error.test.jsx`, `Booking.test.jsx`, `Contact.test.jsx` |
| 15 | Reduced motion | `MotionConfig reducedMotion="user"` + CSS; verified in headless Chrome |
| 16 | 360 / 768 / desktop layouts | Headless Chrome screenshots + overflow check |
| 17 | Build + tests pass | `npm run build`, `npm test` in both packages |

## Final demonstration script

Run end to end in headless Chrome against MongoDB Atlas: admin creates and publishes “Kerala Backwaters Escape — 5 Days” and adds a 6-seat departure → customer searches “Kerala”, books 2 travellers and completes the demo payment → admin finds the booking and cancels it (demo refund). All steps pass with no console errors; test data is removed afterwards.
