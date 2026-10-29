# Deployment: GitHub → Render Free → MongoDB Atlas

This deploys **one** Express web service serving the static pages and REST API. You keep using your existing MongoDB Atlas `brew_and_bite` database, so users, menu, photos and orders persist across deployments.

## Before publishing

1. Back up your locally working project and make a database backup if you have data that matters.
2. From the repository directory run `npm ci`, `npm run check`, `npm test`, and `npm audit`. Investigate any high-severity vulnerabilities before going public; avoid `npm audit fix --force` without reviewing breaking changes.
3. Test local customer registration, owner/staff login, cash checkout, menu photos, customer-specific offers, OTP completion and Razorpay Test Mode if configured.
4. Check `.gitignore`, remove any real credentials from sample data or tracked files, and **rotate previously disclosed MongoDB, Razorpay or JWT secrets**. Never include real `.env` or a database export in Git.
5. Use Razorpay **Test Mode** credentials only. This release is not built for real-money commercial operations.

## 1. Create and push a private GitHub repository

Create an empty **private** repository at https://github.com/new, for example `brew-and-bite-cafe`. Use Git from the folder that directly contains `package.json`:

```bat
git init
git add .
git status
git check-ignore .env
git ls-files .env
git commit -m "Initial Brew and Bite cafe management app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/brew-and-bite-cafe.git
git push -u origin main
```

`git ls-files .env` should print **nothing**. The ignore check is optional when `.env` does not exist in this folder. If an existing Git repository is already configured, don't initialize it again; check `git remote -v` and use your existing remote. If `git status` shows `.env`, `node_modules` or backup ZIPs as staged, stop and remove them from staging first. GitHub authentication may open a browser prompt.

## 2. Create a Render Free Web Service

Open https://dashboard.render.com/ and select **New → Web Service**. Connect your GitHub repository and set:

| Field | Value |
| --- | --- |
| Language/runtime | Node |
| Region | Singapore (if offered) |
| Instance | **Free** (not Starter or paid plans) |
| Root directory | Leave empty if `package.json` is at the repo root |
| Build command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health check | `/api/health` |
| Node.js version | `22.16.0` (provided by `.node-version`) |
| Auto deploy | On Commit |

You may instead use **New → Blueprint** to import the provided `render.yaml`; it describes one Free Node web service and prompts for secret values. Choose **one** of these creation methods so you do not accidentally create two services. If using the Blueprint, check that the resulting plan is Free before deploying.

## 3. Set Render environment variables

In the service's **Environment** settings, add:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | The actual Atlas Drivers connection string; keep private |
| `JWT_SECRET` | A freshly generated secret (minimum 32 characters) |
| `TAX_BPS` | `0` until legitimate tax configuration is determined |
| `RAZORPAY_KEY_ID` | Razorpay **Test Mode** public key ID, optional for cash-only |
| `RAZORPAY_KEY_SECRET` | Razorpay Test Mode secret, optional for cash-only |
| `RAZORPAY_WEBHOOK_SECRET` | Secret you choose when configuring the test webhook |

**Do not commit `.env`**. Never put your Atlas password or secrets directly in `render.yaml` or source files. Render sets `PORT` automatically; the app already listens on `process.env.PORT` and `0.0.0.0`.

To generate a secret locally:

```bat
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

The generated secret should be kept in your password manager, not committed. When a password in an Atlas URI contains special characters (including `@`, `:`, `/`), percent-encode them in the URI. The app forces the database name `brew_and_bite`.

## 4. Allow Render to access MongoDB Atlas

1. In your Render web service, open **Connect → Outbound** and copy the service's outbound CIDR IP ranges.
2. In Atlas, go to **Security → Network Access → Add IP Address** and add the required Render ranges; retain your personal IP for local development if needed.
3. In **Atlas Database Access**, ensure the application user has the necessary read/write privileges on `brew_and_bite`.
4. Redeploy or restart the Render service. Watch its logs for `MongoDB connected to brew_and_bite` and the listening port.

Do not use an unrestricted Atlas IP allowlist if provider-specific ranges can be allowlisted. Do not paste the Atlas connection string in GitHub or screenshots.

## 5. Verify the public application

Your URL will look like `https://YOUR-SERVICE.onrender.com` (Render assigns the actual name).

Open the site from a phone using mobile data. Verify:

- `/api/health` returns JSON with `ok: true`.
- `/api/menu` lists database records, and product photos load.
- Customer registration/login and role-aware navigation work.
- Owner/staff sessions require the correct role, staff approval and HTTPS cookies.
- Cash order → owner acceptance → kitchen preparation → cash collection → OTP completion works.
- Table is released; order history, receipt and confirmed-sales report are correct.
- Owner can inspect customer history and create an offer assigned to one customer, and a different customer cannot redeem it.

If this is a **new database**, run `npm run seed` and `npm run owner:create` locally against that database **before** deployment. Render Free does not provide shell access/one-off jobs. **With your existing database, do not reseed or create another owner.**

## 6. Razorpay Test Mode webhook

1. In the Razorpay **Test Dashboard** create a webhook with URL:

```text
https://YOUR-SERVICE.onrender.com/api/payments/webhook
```

2. Enable `payment.captured` and `payment.failed` and choose a unique webhook secret.
3. Set exactly the same `RAZORPAY_WEBHOOK_SECRET` in Render Environment and redeploy. Do not confuse this secret with `RAZORPAY_KEY_SECRET`.
4. Place a **new** test online order. Use Razorpay's published test payment methods, never real card credentials.
5. Verify a **captured** transaction in the Razorpay test dashboard and `Confirmed` status in Brew & Bite, followed by a valid kitchen order. Re-delivery of a signed webhook must not duplicate revenue.
6. Test a cancelled/failed gateway popup; the existing pending order should remain available for retry. Refunds are not implemented.

## 7. Operating limits and troubleshooting

- Render Free spins down after 15 minutes without requests. The first request after sleep may take about a minute. Its local filesystem is ephemeral; custom menu photos are safely stored **in MongoDB**.
- Render Free allows 750 instance-hours per workspace per calendar month; bandwidth and build-minute quotas also apply. Check https://render.com/docs/free for current terms and your billing page before relying on ₹0 usage.
- Atlas Free has limited storage and read/write throughput and pauses after 30 days of no activity. Check https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/.
- SMTP from Render Free cannot use ports 25, 465 or 587; customer self-service OTP in My Orders is the zero-cost path. SMS is not implemented.
- The two-minute unpaid-online expiry job runs only while the instance is active or when it wakes. Do not promise exact expiry while it is sleeping.
- **Deployment fails at `npm ci`:** inspect `package-lock.json`, Node version and the build log. Do not delete the lockfile casually.
- **MongoDB authentication error:** confirm username/password and URI escaping, especially `@` symbols. Check Atlas Network Access.
- **Razorpay does not open:** confirm Test Mode credentials, inspect browser Console/Network/CSP messages and server logs.
- **Login disappears after deploy:** check `NODE_ENV=production`, HTTPS, and `JWT_SECRET` stability across restarts.
- **App starts but menu fails:** confirm Atlas connectivity and database seed on the intended database.

After successful deployment, take screenshots from the actual public website and record real test results; **source tests alone do not prove live deployment**.

Official references:
- https://render.com/docs/free
- https://render.com/docs/outbound-ip-addresses
- https://render.com/docs/blueprint-spec
- https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
- https://razorpay.com/docs/payments/dashboard/test-live-modes/
