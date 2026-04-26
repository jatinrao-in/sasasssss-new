# Production Deployment

This workspace contains two Vite apps backed by one Firebase project and a Vercel-hosted serverless API:

- `admin-panel`
- `team-member-pwa`
- `api/*` serverless routes

## Live Architecture

- Vercel serves both frontends and the `/api/*` routes from one project.
- Firebase provides Authentication, Firestore, and Cloud Messaging.
- MSG91 delivers WhatsApp messages from the server-side API.

## Firebase Console

1. Open the `saya-industrial` Firebase project.
2. Enable `Authentication -> Sign-in method -> Email/Password`.
3. Enable `Firestore Database`.
4. Make sure your web app config matches the values used in the frontend env files.

## Install

```bash
npm install
npm --prefix admin-panel install
npm --prefix team-member-pwa install
```

## Required Environment Variables

Set these in the Vercel project before deploying:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY`
- `VITE_API_BASE_URL`
- `VITE_ADMIN_URL`
- `VITE_PWA_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `GEMINI_API_KEY`
- `MSG91_AUTH_KEY`
- `MSG91_INTEGRATED_NUMBER`
- `CRON_SECRET`

Optional but recommended:

- `CORS_ALLOWED_ORIGINS`
  Use a comma-separated list of any extra trusted origins that should be allowed to call the API cross-origin.
  Same-origin Vercel traffic and the configured app URLs are allowed automatically.

Use [.env.example](/c:/Users/RAO%20JATIN/OneDrive/sasasssss/.env.example) as the shape reference.

## Fix FIREBASE_PRIVATE_KEY On Vercel

If Vercel logs show `error:1E08010C:DECODER routines::unsupported`, the Firebase Admin private key in the Vercel project is malformed.

1. Generate a new service account key in `Firebase Console -> Project Settings -> Service Accounts`.
2. Delete the existing `FIREBASE_PRIVATE_KEY` value in Vercel.
3. Paste the new key into Vercel with the full PEM boundaries:

```text
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

4. Redeploy the Vercel project after saving the env var.

The server code now accepts either escaped `\n` values or real multiline PEM values, but the key itself still must be valid. You can validate local env values with:

```bash
node scripts/validate-env.mjs backend
```

## Local Production Build

```bash
npm run build
```

The build fails fast if required frontend environment variables are missing.

## Production Preflight

Pull the live Vercel production env, validate both frontend and backend variables, and build the exact deployment artifact locally:

```bash
npm run verify:vercel
```

If you need to refresh the pulled env file first:

```bash
npm run vercel:pull:prod
```

This produces `.vercel/output` and catches:

- missing Vite public env vars
- missing Firebase Admin / Gemini / MSG91 / cron secrets
- malformed `FIREBASE_PRIVATE_KEY`
- Vercel build regressions before deployment

## Health Check

After deployment, confirm the backend is ready:

```bash
curl https://your-domain/api/health
```

The endpoint returns `200` when the required server-side production config is valid and `503` when a required secret is missing or malformed.

## WhatsApp Automation Cron

The admin WhatsApp page stores its schedule in Firestore at `settings/whatsapp_automation`. Because the admin can choose any `HH:mm` time, the serverless cron hits both reminder slots every minute and the API sends only when the current IST time matches the saved slot.

Vercel cron routes in [vercel.json](/c:/Users/RAO%20JATIN/OneDrive/sasasssss/vercel.json):

- `/api/cron/send-reminders?slot=morning`
- `/api/cron/send-reminders?slot=evening`

Each request must include:

- `Authorization: Bearer {CRON_SECRET}`

Free fallback with `cron-job.org`:

1. Create one job for `https://your-domain/api/cron/send-reminders?slot=morning`
2. Create one job for `https://your-domain/api/cron/send-reminders?slot=evening`
3. Add header `Authorization: Bearer {CRON_SECRET}`
4. Run both jobs every minute

Manual verification example:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://your-domain/api/cron/send-reminders?slot=morning&force=1"
```

## Deploy To Vercel

```bash
npm run deploy:vercel:prod
```

This sequence pulls the current production env, validates it, runs `vercel build --prod`, and deploys the prebuilt artifact with `vercel deploy --prebuilt --prod`.

## Notes

- Admin team-member creation is handled by `api/create-member`.
- Team-member updates are handled by `api/update-member`.
- WhatsApp drafting and summaries now run server-side using `GEMINI_API_KEY`.
- Serverless API CORS is locked to same-origin Vercel traffic, configured app URLs, localhost dev origins, and any extra `CORS_ALLOWED_ORIGINS`.
- `.vercelignore` explicitly excludes local env files, Firebase admin JSON keys, debug logs, and other local-only artifacts from Vercel uploads.
- Project `totalExpense` is recalculated from the top-level `expenses` collection.
- Project `completionPercent` is recalculated from the top-level `tasks` collection.
- Salary documents live at `/salary/{uid}/months/{monthYear}`.
- Notification documents live at `/notifications/{uid}/items/{notificationId}`.
