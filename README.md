# Brew & Bite Café Management System

A full-stack café ordering and management application built for a college project. The same Express server delivers the responsive website and its REST APIs; MongoDB Atlas holds menu items, users, orders, customer offers and product photos.

**Project status:** Local customer → owner → kitchen → OTP/cash workflow has been manually exercised by the project team. The bundled automated tests cover pricing, checkout retry, loyalty rules and static UI contracts. **Public Render deployment and live Razorpay Test Mode webhooks must be verified separately.** Do not use this project for real-money payments or commercial operations without further security and operational work.

## Features

| Role | What the user can do |
| --- | --- |
| **Customer** | Register/login, browse/search the menu, manage cart, choose a table, apply eligible coupons, place cash or Razorpay test orders, retry interrupted online payments, track orders, view receipts, request collection OTP and edit profile. |
| **Owner** | Manage menu/category/price/availability, upload or replace product images, manage tables and staff approvals, accept/cancel eligible orders, record received cash, view confirmed sales/CSV reports, inspect customer history and create public or customer-specific offers. |
| **Kitchen staff** | Access a role-specific dashboard after approval, read accepted orders and instructions, mark Preparing/Ready and verify the customer's OTP to complete a paid order. |

**Customer loyalty:** A *regular customer* has **at least five completed, payment-confirmed orders in the rolling last seven days**. Owner offers may target everyone, selected customer accounts, or all currently qualifying regular customers. Eligibility and prices are rechecked on the server at checkout.

**Payment modes:** Cash is recorded as Pending until the owner confirms collection. UPI/card are implemented through **Razorpay Test Mode only**; orders become Confirmed only after server-side payment/capture verification. Closing the gateway retains the existing pending order for retry. Live payments and automatic refunds are not implemented.

## Technology stack

| Layer | Technologies | Reason |
| --- | --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript, Fetch API | Simple, responsive, no frontend build required |
| Backend | Node.js 22, Express 4 | One server for API routes and static pages |
| Database | MongoDB Atlas Free + Mongoose 8 | Cloud persistence, document models, straightforward setup |
| Auth/security | bcryptjs, JWT HttpOnly cookies, CSRF token, Zod, Helmet, rate limiting | Role-level access and server validation |
| Payment | Razorpay Node SDK (test mode) | Checkout, signatures, capture checks and webhooks |
| Notifications | Built-in customer-visible OTP; optional Nodemailer SMTP | Dependable OTP for demo without SMS provider |
| Testing | Node's built-in test runner | Focused dependency-light automated tests |
| Hosting | GitHub + Render Free + MongoDB Atlas | One public Express service and one persistent managed database |

## How the application was developed

1. **Requirements and roles:** Defined Customer, Owner and approved Staff permissions, ordering and handover workflows.
2. **Database design:** Created Mongoose models for users, categories, menu items, photos, offers, tables, orders, payment attempts, OTP and webhook events.
3. **REST API:** Split Express routes into authentication, catalog, ordering, management, kitchen, payments and reports, with reusable billing and loyalty services.
4. **Frontend:** Built role-aware pages and shared navigation in plain HTML/CSS/JavaScript. Pages use the shared `fetch` client in `public/js/common.js`.
5. **Business rules:** Implemented server-side cart pricing in integer paise, atomic table claiming, authorized order-status changes and customer-specific discount checks.
6. **Payments and collection:** Added Razorpay test-order creation, provider verification, signed webhook handling, cash confirmation and five-minute hashed OTP handover.
7. **Testing and deployment:** Added automated regression tests and a Render Blueprint, with a plan to verify the publicly deployed workflow after connecting external accounts.

## Architecture

```text
Browser (Customer / Owner / Staff)
    │  HTML + CSS + JavaScript / Fetch API
    ▼
Node.js / Express (one Render web service)
    ├── /             Static pages & assets
    ├── /api/auth     Login, JWT cookie, roles & CSRF
    ├── /api          Catalog, table availability & offers
    ├── /api/orders   Pricing, checkout, history & OTP request
    ├── /api/owner    Menu, photos, tables, staff, customers & reports
    ├── /api/kitchen  Preparation & OTP handover
    └── /api/payments Razorpay test order, verify & signed webhook
                 │                       │
                 ▼                       ▼
          MongoDB Atlas            Razorpay Test Mode
    (users, orders, offers, photos)
```

See [database architecture](docs/DATABASE_DESIGN.md) and [API documentation](docs/API_DOCUMENTATION.md).

## Run locally on Windows

Install **Node.js 22**, **Git** and **VS Code**; create a MongoDB Atlas Free cluster/database user. Add your current IP to Atlas Network Access and obtain its Drivers connection string.

Open this repository folder in VS Code and run in **Windows Command Prompt (CMD)**:

```bat
copy .env.example .env
notepad .env
npm ci
npm run check
npm test
npm run dev
```

In `.env`, set `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters. Do **not** upload `.env` or share it. The application always uses the MongoDB database named `brew_and_bite`.

Visit **http://localhost:3000** after the server reports a successful MongoDB connection.

### First-time setup only

If this is a **new, empty database**, stop the server and execute:

```bat
npm run seed
set "OWNER_EMAIL=your-owner-email@example.com"
set "OWNER_PASSWORD=REPLACE_WITH_YOUR_OWN_STRONG_12_PLUS_CHARACTER_PASSWORD"
set "OWNER_NAME=Brew and Bite Owner"
npm run owner:create
set "OWNER_EMAIL="
set "OWNER_PASSWORD="
set "OWNER_NAME="
npm run dev
```

If you **already have working Atlas data and an owner account, skip these initialization commands**. Do not recreate the owner. The `seed` script inserts missing demo records only.

> In VS Code **PowerShell**, use `Copy-Item .env.example .env` instead of `copy`, and `$env:OWNER_EMAIL=...` for temporary owner variables. Never publish the terminal history or screenshots containing credentials.

## Main pages

| Page | URL | Access |
| --- | --- | --- |
| Home / menu / about / public offers | `/`, `/menu.html`, `/about.html`, `/offers.html` | Public; personalized by role |
| Login and registration | `/login.html`, `/register.html`, `/staff-register.html` | Public |
| Cart and checkout | `/cart.html`, `/checkout.html` | Customer ordering |
| Orders and receipts | `/orders.html`, `/receipt.html` | Customer's own orders |
| Owner dashboard + customer loyalty | `/owner.html` | Owner |
| Kitchen workspace | `/kitchen.html` | Approved staff/owner APIs |
| Profile | `/profile.html` | Signed-in users |

## Developer commands

| Command | Function |
| --- | --- |
| `npm ci` | Install exactly the versions in `package-lock.json` |
| `npm run dev` | Local server with file-watch restart |
| `npm start` | Production server |
| `npm run check` | Parse-check JavaScript files |
| `npm test` | Automated regression tests |
| `npm audit` | Review npm dependency advisories before publishing |
| `npm run seed` | Insert missing *sample* data (first setup only) |
| `npm run owner:create` | Initialize the first owner (first setup only) |

## Project files

```text
brew-and-bite/
├── public/               HTML pages, CSS, JS, locally bundled SVGs
│   ├── js/common.js      Shared API client, session/header and cart helpers
│   ├── js/customer.js    Shopping, checkout, order tracking and receipts
│   ├── js/owner.js       Owner management dashboard
│   ├── js/loyalty.js     Customer directory and targeted offer controls
│   └── js/kitchen.js     Kitchen board and collection handover
├── src/
│   ├── app.js            Express middleware, routes and static pages
│   ├── config/           Environment and MongoDB connection
│   ├── middleware/       Auth, role, CSRF and error handlers
│   ├── models/           Mongoose schemas
│   ├── routes/           REST APIs
│   ├── services/         Billing, loyalty, payments, OTP and notifications
│   ├── jobs/             Eligible unpaid online order expiry
│   └── utils/            Input validation and reusable helpers
├── scripts/              Syntax check, database seed and first owner
├── tests/                Automated functional and regression tests
├── docs/                 API, database design, deployment and test guide
├── .env.example          Safe local configuration template
├── .gitignore            Local and sensitive-file exclusions
├── package.json
├── package-lock.json
├── render.yaml           Single-service Render Free blueprint
└── server.js             Entry point
```

## Deployment

**Chosen environment:** one **Render Free Web Service** for both the frontend and Express backend, backed by the existing **MongoDB Atlas Free** cluster. Product photos are stored as compact JPEGs **in MongoDB**, because Render's free local filesystem is temporary.

- Render build: `npm ci --omit=dev`; start: `npm start`; health: `/api/health`.
- Add `MONGODB_URI` and a new `JWT_SECRET` in Render's Environment settings. Use Razorpay **Test Mode** keys only for this demo.
- Allowlist the Render service's **Outbound** IP ranges in Atlas Network Access.
- After deployment configure Razorpay's test webhook at `https://YOUR-SERVICE.onrender.com/api/payments/webhook`, using a matching webhook secret.
- Verify your hosted registration, order, cash/online payment, kitchen OTP and reporting workflows over HTTPS.

Follow the [step-by-step Render deployment guide](docs/DEPLOYMENT_GUIDE.md).

### Free-tier and current limitations

- Render Free sleeps after 15 minutes of inactivity and has 750 included instance-hours/month. Returning visitors may experience a cold start. Free-service bandwidth/build usage is limited. Check current [Render Free documentation](https://render.com/docs/free).
- MongoDB Atlas Free has limited storage (about 512 MB) and pauses after 30 days with no activity. Check [Atlas Free limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).
- Unpaid online orders are checked for 30-minute expiry while the server is running and on startup, **not continuously while Render is asleep**.
- Render Free blocks SMTP ports 25, 465 and 587. In-app order OTP is the reliable demonstration path; SMS is **not** implemented.
- Razorpay Test Mode does not collect real money. Payment refunds, production payment compliance, high-traffic scaling, and formal security audit are **outside current scope**.
- No cloud deployment is claimed until it has actually been published and tested.

## Documentation

- [Database and architecture](docs/DATABASE_DESIGN.md)
- [REST API reference](docs/API_DOCUMENTATION.md)
- [Local/online testing](docs/TESTING_GUIDE.md)
- [GitHub + Render + Atlas deployment](docs/DEPLOYMENT_GUIDE.md)

## Security

**Never commit `.env`**, API keys, database passwords, JWT secrets, user data exports or credentials in screenshots. Check `git status` and `git ls-files .env` before each push. Rotate any credentials previously shared outside the application. Customer, owner and staff permissions are enforced by the backend; frontend navigation alone is not a security boundary.
