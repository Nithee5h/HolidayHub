# HolidayHub architecture & roadmap

## Repository layout

```text
HolidayHub/
├── README.md
├── docs/                        # architecture, API, security, testing, deployment, screenshots
├── client/                      # React + Vite SPA
│   ├── index.html               # fonts, meta, favicon
│   ├── vite.config.js           # Vite + Vitest config
│   ├── eslint.config.js
│   └── src/
│       ├── main.jsx             # styles (Bootstrap subset, icons, tokens), router
│       ├── App.jsx              # routes + <MotionConfig reducedMotion="user">
│       ├── styles/              # bootstrap.scss (only used modules) · tokens.css · global.css · animations.css
│       ├── components/
│       │   ├── layout/          # Layout, Navbar, UserMenu, MobileNav, Footer, PageHeader, PageTransition, ScrollToTop
│       │   ├── auth/            # AuthLayout, RequireAuth, GuestOnly
│       │   ├── ui/              # Button, Chip, ConfirmDialog, Drawer, Stepper, TextField, PasswordField, TableScroll, SmartImage, SectionHeading, Reveal, Skeleton, EmptyState
│       │   ├── travel/          # SearchBar, FilterPanel, DestinationCard, PackageCard(+Skeleton)
│       │   ├── package/         # Gallery, ItineraryTimeline, DepartureSelector, BookingSummary
│       │   ├── booking/         # ProgressSteps, DemoPaymentPanel, HoldCountdown, StatusBadge, SuccessCheck
│       │   ├── admin/           # AdminLayout, StatCard/CountUp, BarChart, RankedBars, PackageForm, DepartureManager
│       │   └── home/            # Hero, PopularDestinations, HandpickedExperiences, WhyTravel, Inspiration, Testimonials, CtaBand
│       ├── data/                # editorial content: destinations, photos (catalog data lives in MongoDB)
│       ├── context/             # AuthProvider (useAuth/useLogout), ToastProvider (useToast)
│       ├── hooks/               # useAsync, useForm, useModalBehavior, useScrolled, useMediaQuery, useDocumentTitle
│       ├── services/            # http (fetch + envelope), catalog, auth, bookings, contact, admin, ApiError
│       ├── pages/               # Home, Packages, PackageDetails, Checkout, MyBookings, BookingDetails, Login, Register, Profile, Contact, Destinations, About, NotFound, admin/
│       ├── utils/               # search (URL state), departures (UI availability checks), dates, format, redirect, password, id
│       └── test/                # Vitest setup, router helper, fixtures, auth mock
├── render.yaml                  # Render blueprint for the API
├── client/vercel.json           # SPA fallback, /api rewrite, caching + security headers
├── .github/workflows/ci.yml     # lint + test + build for client and server
└── server/                      # Express 5 + Mongoose API
    ├── server.js                # connect DB, listen, graceful shutdown
    ├── src/
    │   ├── app.js               # helmet, CORS, JSON, routes, 404 + error handler
    │   ├── config/              # env (zod-validated), db
    │   ├── models/              # User, Package, Departure, Booking, Payment, ContactMessage
    │   ├── validators/          # zod schemas for query/params/body
    │   ├── middleware/          # validate, errors, rateLimit, auth (requireAuth/optionalAuth/requireRole), originGuard
    │   ├── services/            # catalogService, authService, bookingService, adminService (stats, package/departure/booking management)
    │   ├── controllers/  routes/
    │   ├── utils/               # dates (calendar-date handling), ApiError, respond, toJSON plugin
    │   └── seed/                # data/packages.json, departure schedule, repeatable seed
    └── test/                    # supertest + mongodb-memory-server
```

## Design system

- **Tokens** live in `client/src/styles/tokens.css` (palette, `clamp()` type scale, radius, shadows, motion durations) and are bridged onto Bootstrap's `--bs-*` variables.
- **Contrast:** white on Sunset Coral is ~2.6:1, so coral buttons use Deep Ocean text; body-size teal and coral text use `--hh-teal-ink` (#00796B) and `--hh-coral-ink` (#B9401F). Chart marks use the validated `--hh-chart` (#009E89).
- **Bootstrap:** compiled from Sass with only reboot, grid, utilities, forms, tables, alerts and helpers; the app's own components replace buttons, cards, navbars and modals.
- **Motion:** CSS for hover/focus (150–250 ms); Motion for React for scroll reveals, staggered lists, layout filtering, route enter transitions, drawer and hero parallax. `MotionConfig reducedMotion="user"` plus a CSS `prefers-reduced-motion` block, and the hero parallax/card tilt are switched off explicitly for reduced motion.
- **Images:** stored as `{ url, alt }` (matching the package schema). Unsplash URLs get responsive `srcset` sizes; `SmartImage` lazy-loads with shimmer and a branded fallback.

## Search & URL state

`/packages` derives all filters from query params (`destination, category, theme, minPrice, maxPrice, duration, date, travellers, sort`) via `utils/search.js`, so results are shareable and survive refresh; the API applies the filtering.

**Availability rule:** when a search names a date and/or party size, a package is only listed if it has a *bookable* departure — status `open`, starting after today, `seatsRemaining >= travellers` and, if a date is given, starting within 30 days of it. Sold-out departures still show on the details page (disabled) so travellers see what exists.

## Data access

MongoDB is the single source of truth for packages and departures. Pages call `services/catalog.js`, which uses `services/http.js` (fetch, `credentials: 'include'`, envelope unwrapping, `ApiError` with status/details). `useAsync` handles loading, stale-while-refetching, errors and retry. Filtering, availability and facets run on the server (`catalogService.js`); the client only parses/builds URL state.

**Dates:** departures are calendar dates stored as `Date` at 00:00 UTC and exchanged as `YYYY-MM-DD`. "Today" is computed in `APP_TIMEZONE` (default Asia/Kolkata).

**Seeding:** `npm run seed` upserts packages by slug and only creates departures for packages that have none (so it never disturbs existing bookings). Departure dates are generated relative to the seed date. `--reset` wipes catalog/booking collections and is refused when `NODE_ENV=production`.

**Topology:** in development Vite (and `vite preview`) proxy `/api` to Express; in production Vercel rewrites `/api` to the API. The browser always sees a single origin, so HttpOnly session cookies are first-party. See [deployment.md](deployment.md).

## Phase plan

1. **Foundation + homepage** — done. Seed data is client-side; Login/Register/My Bookings/Contact show honest "not available yet" pages.
2. **Discovery** — done. Filter sidebar + mobile sheet, availability filtering, gallery, itinerary accordion, departure picker, booking summary, skeletons, error/retry. “Book Now” lands on `/booking/:departureId`, which confirms the selection but does not reserve anything until Phase 5.
3. **API** — done. Express 5 + Mongoose models for all spec collections, repeatable seed, zod validation, central errors, catalog + contact endpoints, frontend switched to the API. Newsletter still omitted (spec allows omitting until consent storage is built).
4. **Auth** — done. bcrypt, JWT in an HttpOnly SameSite cookie, origin-checked CSRF defence, rate limits, AuthContext + RequireAuth/GuestOnly, account menu, profile editing, `/admin/users`, env-driven admin seed. Details in [security.md](security.md).
5. **Booking** — done. Quote → atomic reservation with 15-minute hold → idempotent demo payment → confirmation; My Bookings tabs, booking details, cancellation policy (7 days, demo refund), hold-expiry sweep, ConfirmDialog + toasts, route-level code splitting.
6. **Admin** — done. Dashboard (count-up stats, validated single-hue SVG charts with tooltips + table view), package CRUD with archive-when-booked, departure capacity management that never drops below booked seats, bookings table with filters and guarded status transitions, customers list.
7. **Polish & deploy** — done. axe-core audit (0 WCAG 2.1 AA violations across roles and widths), contrast tokens, keyboard-scrollable tables, Bootstrap Sass subset (CSS −29%), route-level code splitting, production guards (`TRUST_PROXY`, placeholder-secret check, graceful shutdown), Vercel/Render configs, CI, README screenshots and deployment guide.
