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
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `GEMINI_API_KEY`
- `MSG91_AUTH_KEY`
- `MSG91_INTEGRATED_NUMBER`
- `CRON_SECRET`

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

## Deploy To Vercel

```bash
vercel env ls
vercel --prod
```

## Notes

- Admin team-member creation is handled by `api/create-member`.
- Team-member updates are handled by `api/update-member`.
- WhatsApp drafting and summaries now run server-side using `GEMINI_API_KEY`.
- Project `totalExpense` is recalculated from the top-level `expenses` collection.
- Project `completionPercent` is recalculated from the top-level `tasks` collection.
- Salary documents live at `/salary/{uid}/months/{monthYear}`.
- Notification documents live at `/notifications/{uid}/items/{notificationId}`.
