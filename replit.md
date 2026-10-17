# Running PopPay on Replit

## Start the app

Use the `Start application` workflow, which runs:

```sh
npm run dev:poppay
```

The React dashboard and hosted checkout are available on port 5000. The API listens on port 3001 and is proxied by Vite.

## Required configuration

Add these values in Replit Secrets:

- `MONGO_URI` — MongoDB replica-set connection string; a standalone MongoDB server will not support the transactions this app uses.
- `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` — Google OAuth web application credentials with the Gmail API enabled.
- `JWT_SECRET` — a strong, randomly generated signing secret.
- `ENCRYPTION_KEY` — 32 random bytes encoded as 64 hexadecimal characters or base64.

`GMAIL_REDIRECT_URI` is configured from this Replit development domain. Register its exact value as an authorized redirect URI in the Google OAuth client. For a published deployment, configure the production callback URL separately.

`GMAIL_POLL_INTERVAL_MS` is optional and defaults to 10000 milliseconds.

## Other commands

- `npm run build:client` — build the dashboard.
- `npm run test:poppay` — run the PopPay tests.
- `npm run start:poppay` — run the API without the Vite development server.
