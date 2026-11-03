# Authentication & security notes

## Sessions
- Login/registration issue a JWT (`sub`, `role`, expiry = `SESSION_DAYS`) signed with `JWT_SECRET`, stored in the **`hh_session` cookie**: `HttpOnly` (unreadable by page scripts → XSS can't steal it), `SameSite=Lax` by default, `Secure` in production.
- The API re-loads the user on every authenticated request, so deleted accounts and role changes apply immediately (a stale token can't keep admin rights).
- `GET /auth/me` is a *session check*: `200 { user }` or `200 { user: null }` (and clears an invalid cookie). Endpoints that need a user return `401`; admin endpoints return `403` to non-admins.
- Logout clears the cookie. Tokens are stateless, so a copied token stays valid until it expires; acceptable for this demo (a server-side session store or token version would allow forced revocation).

## Passwords
- bcrypt, cost 12. Policy (client and server): 8–72 chars, at least one letter and one number.
- Login returns the same `Invalid email or password` for unknown emails and wrong passwords, and compares against a dummy hash for unknown emails to reduce timing differences.
- Registration does reveal that an email is already registered (`409`) — a usability trade-off most sites make; rate limiting limits enumeration.

## Authorization
- Roles: `customer`, `admin`. Public registration always creates customers; any `role` in the request body is stripped by validation.
- The first admin is created by `npm run seed:admin` from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env` (never in code). It refuses placeholder values and refuses to promote an existing customer automatically.
- Client route guards (`RequireAuth`) are UX only; every rule is enforced by API middleware (`requireAuth`, `requireRole('admin')`).

## CSRF / CORS
- CORS allows only `CLIENT_ORIGIN` origins, with credentials.
- `originGuard` rejects POST/PUT/PATCH/DELETE whose `Origin` header isn't an allowed client origin (`403`). Browsers always send `Origin` on such requests; non-browser clients without it can't carry a victim's cookies.
- `SameSite=Lax` cookies are not sent on cross-site POSTs. In development the Vite proxy makes the app and API same-origin.
- **Cross-site deployment** (e.g. web on Vercel, API on another domain): set `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true` (enforced together), and list the web origin in `CLIENT_ORIGIN`. The origin guard remains the CSRF defence in that mode.

## Abuse limits
In-memory per-IP limits: login 10 / 15 min, registration 10 / hour, contact 5 / 10 min. Suitable for a single instance; use a shared store if scaled out.

## Secrets
`server/.env` (git-ignored) holds `MONGODB_URI`, `JWT_SECRET` and admin seed credentials. Never put secrets in `VITE_*` variables.

## Bookings & payments
- **No real payments.** `POST /payments/demo` accepts no card data and only records `provider: 'demo'` transactions (`success_demo`, `failed_demo`, `refunded_demo`). The UI labels every payment as simulated.
- **Inventory:** seats are reserved with a single atomic conditional update (`seatsRemaining >= n` → `$inc: -n`), so concurrent requests cannot oversell; tested with 8 simultaneous requests for the last seat.
- **Consistency without transactions:** if creating the booking fails after reserving seats, the seats are released (compensation). Expiry and cancellation flip the booking state with a conditional update first, so seats are released exactly once. This is not a full multi-document transaction; a crash between steps could leave a hold that the expiry sweep later releases.
- **Idempotency:** bookings accept a client `idempotencyKey` (unique per user); payments are idempotent per booking via a unique partial index on successful payments.
- **Access:** bookings are visible only to their owner or an admin; others receive `404` so ids can't be probed.
