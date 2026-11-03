import { z } from 'zod';

/*
 * Validated runtime configuration. Secrets come from the environment only
 * (server/.env locally, the host's settings in production) — never from code.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5050),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB: z.string().min(1).default('holidayhub'),
  // Comma-separated list of allowed browser origins for CORS.
  // Dev server (5173) and `vite preview` of the production build (4173).
  CLIENT_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173'),
  // Calendar "today" for departure availability is evaluated in this zone.
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  // Signs session tokens. Generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  // 'lax' when web app and API share a site (dev proxy / same domain);
  // 'none' (requires secure) when they are deployed on different sites.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  // Number of reverse proxies in front of the API (Render, Vercel rewrite…), so
  // req.ip is the real client for rate limiting. 'false' disables.
  TRUST_PROXY: z.string().regex(/^(\d+|true|false)$/).default('1'),
});

function load() {
  const parsed = schema.safeParse({
    ...process.env,
    // Tests supply their own in-memory database URI at runtime.
    MONGODB_URI: process.env.MONGODB_URI ?? (process.env.NODE_ENV === 'test' ? 'mongodb://test' : undefined),
    JWT_SECRET: process.env.JWT_SECRET ?? (process.env.NODE_ENV === 'test' ? 'test-only-secret-that-is-long-enough-1234567890' : undefined),
  });
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}\nCopy server/.env.example to server/.env and fill it in.`);
  }
  const isProduction = parsed.data.NODE_ENV === 'production';
  const cookieSecure = parsed.data.COOKIE_SECURE ? parsed.data.COOKIE_SECURE === 'true' : isProduction;
  if (parsed.data.COOKIE_SAMESITE === 'none' && !cookieSecure) {
    throw new Error('COOKIE_SAMESITE=none requires COOKIE_SECURE=true (browsers reject it otherwise).');
  }
  if (isProduction && /^replace-with|change-me/i.test(parsed.data.JWT_SECRET)) {
    throw new Error('JWT_SECRET still has a placeholder value. Generate a real secret before deploying.');
  }
  const tp = parsed.data.TRUST_PROXY;
  return {
    ...parsed.data,
    trustProxy: tp === 'true' ? true : tp === 'false' ? false : Number(tp),
    cookieSecure,
    clientOrigins: parsed.data.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
  };
}

export const env = load();
