# Deploying HolidayHub

Recommended topology (free tiers work for a demo):

```
Browser ──► Vercel (React build)  ──/api/* rewrite──►  Render (Express API)  ──►  MongoDB Atlas
            https://<app>.vercel.app                   https://holidayhub-api.onrender.com
```

The web app proxies `/api` to the API, so the browser only ever talks to one origin. Session cookies stay
**first-party** (`SameSite=Lax`), which avoids third-party-cookie blocking in Safari/Chrome and keeps the CSRF
origin check simple.

## 1. MongoDB Atlas

1. Create a database user with access to the `holidayhub` database only.
2. **Network Access:** allow Render's outbound IPs (Render dashboard → service → *Connect* → *Outbound*), or `0.0.0.0/0`
   temporarily for a short-lived demo.
3. Copy the `mongodb+srv://…` connection string.

## 2. API on Render

1. Push the repository to GitHub.
2. Render → **New → Blueprint** → pick the repo. `render.yaml` creates the `holidayhub-api` web service
   (`rootDir: server`, health check `/api/health`, `JWT_SECRET` generated automatically).
3. Fill the variables marked *sync: false*:

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | Atlas connection string |
   | `CLIENT_ORIGIN` | Your Vercel URL, e.g. `https://holidayhub.vercel.app` (comma-separate several) |

4. After the first deploy, open the service **Shell** and run:

   ```bash
   npm run seed                      # demo catalog (safe to re-run)
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<strong password>' npm run seed:admin
   ```

   Admin credentials are passed only to that one command; they are never stored in the repo.

5. Note the service URL. If it isn't `https://holidayhub-api.onrender.com`, update the `/api` rewrite in
   `client/vercel.json`.

## 3. Web app on Vercel

1. Vercel → **Add New Project** → import the repo, set **Root Directory** to `client` (framework: Vite).
2. Leave `VITE_API_URL` unset — the default `/api` goes through the rewrite in `client/vercel.json`.
3. Deploy. `vercel.json` also provides the SPA fallback (deep links and refresh work), immutable caching for hashed
   assets and security headers.
4. Make sure the deployed URL matches `CLIENT_ORIGIN` on Render (add preview URLs there too if you use them).

## Production environment variables

| Where | Variable | Notes |
|---|---|---|
| API | `NODE_ENV=production` | Secure cookies, hides internal error messages, refuses `seed --reset` |
| API | `MONGODB_URI`, `MONGODB_DB` | Atlas connection |
| API | `JWT_SECRET` | ≥ 32 random chars; startup fails on placeholder values in production |
| API | `CLIENT_ORIGIN` | Exact web origin(s) for CORS and the CSRF origin check |
| API | `COOKIE_SAMESITE` | `lax` with the `/api` rewrite. Only if the browser calls the API cross-site directly: `none` (requires `COOKIE_SECURE=true`) |
| API | `TRUST_PROXY` | Number of proxies in front of Express (Render = 1) so rate limits see real client IPs |
| API | `SESSION_DAYS`, `APP_TIMEZONE` | Optional (defaults 7, Asia/Kolkata) |
| Web | `VITE_API_URL` | Optional. Only for calling the API directly; **never put secrets in `VITE_*`** — they are bundled into the client |

## Verifying a deployment

```bash
curl https://<app>.vercel.app/api/health     # {"success":true,"data":{"status":"ok","db":"connected"}}
```

Then walk the demo script in [testing.md](testing.md): register → search “Kerala” → book → demo payment → admin cancels.

## Notes & limitations

- Render's free plan sleeps when idle; the first request after a pause can take ~30 s.
- Rate limits and the seat-hold sweep run in-process. That is correct for a single instance; scaling to several
  instances would need a shared store (e.g. Redis) for rate limits.
- Payments are simulated (`provider: "demo"`). Real payments would require a hosted, compliant provider.
- Demo credentials belong only in demo environments; rotate the Atlas password and admin password after sharing a demo.
