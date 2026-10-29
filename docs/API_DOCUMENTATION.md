# REST API documentation

**Base:** `/api`. Request and response use JSON except signed Razorpay webhook (raw JSON), owner JPEG photo upload (raw image/jpeg), public image responses and report CSV. All normal success responses include `{ "ok": true, ... }`; failures include `{ "ok": false, "error": "..." }` with appropriate HTTP status.

**Authentication:** `bb_auth` JWT session cookie, HttpOnly/SameSite. Every POST/PATCH/DELETE browser request (except Razorpay webhook) must include `X-CSRF-Token` matching the `bb_csrf` cookie obtained from `GET /api/auth/csrf`. Frontend `public/js/common.js` handles this. Roles: `public`, `customer`, `staff` (approved), `owner`, or `staff+owner`. `owner` is never self-registered.

## Authentication

| Method/path | Role | Body | Expected response / errors |
|---|---|---|---|
| GET `/health` | Public | – | Service health info 200 |
| GET `/auth/csrf` | Public | – | Token issued with CSRF cookie |
| POST `/auth/register` | Public | `{name,email,password}` | 201 customer user + JWT cookie; 409 duplicate, 400 invalid |
| POST `/auth/staff/request` | Public | `{name,email,password}` | 201 pending request; 409 duplicate |
| POST `/auth/login` | Public | `{email,password}` | 200 login + cookie; 401 invalid, 403 unapproved/disabled |
| POST `/auth/logout` | Public | – | Clear cookie, 200 |
| GET `/auth/me` | Logged in | – | User profile; 401/403 |
| PATCH `/auth/me` | Logged in | `{name?,phone?}` | Updated profile; 400 invalid |

## Public catalog and offers

| Method/path | Role | Inputs | Response / errors |
|---|---|---|---|
| GET `/categories` | Public | – | Active categories |
| GET `/menu` | Public | `q`, `category`, `available`, `page`, `limit` | Paginated active items, total, pages |
| GET `/tables` | Public | – | Active tables with availability |
| GET `/offers` | Public | – | Active nonexpired promo summary |
| POST `/offers/validate` | Customer | Order-shaped body | Server-calculated eligible totals; 400 ineligible |

## Customer orders

Order-shaped request:

```json
{
  "items":[{"menuItem":"24_HEX_OBJECT_ID", "quantity":2}],
  "table":"24_HEX_OBJECT_ID",
  "paymentMethod":"cash",
  "instructions":"Less sugar",
  "offerCode":"WELCOME10"
}
```

`menuItem` and `table` must be actual 24-digit MongoDB ObjectIds. Never provide prices from frontend.

| Method/path | Role | Body / response | Errors |
|---|---|---|---|
| POST `/orders/preview` | Customer | Order-shaped body → quote and price snapshots | 400 invalid items/offers; 409 occupied table |
| POST `/orders` | Customer | Order-shaped body → 201 saved order and reserved table | 400 bad cart; 409 table conflict |
| GET `/orders?page=1` | Customer | Own 20 most recent paginated orders | 401,403 |
| GET `/orders/:id` | Customer | Own order with snapshots | 404 other user's order |
| POST `/orders/:id/cancel` | Customer | – → cancel own unpaid Placed order | 409 if ineligible |
| POST `/orders/:id/otp` | Customer | – → newly issued six-digit OTP for own Ready order | 403 other customer; 409 not Ready; 429 cooldown |

## Payments

| Method/path | Role | Body / response | Errors |
|---|---|---|---|
| POST `/payments/:id/create` | Customer | – → Razorpay Test order ID, amount paise, public key | 503 keys absent; 409 wrong order state |
| POST `/payments/:id/verify` | Customer | `{razorpay_order_id,razorpay_payment_id,razorpay_signature}` → backend verification, provider capture fetch | 400 bad signature; 409 not captured |
| POST `/payments/webhook` | Razorpay only | Raw JSON signed `X-Razorpay-Signature`; events `payment.captured`, `payment.failed` | 400 bad signature; 503 not configured |

Payment confirmation **requires** server-side signature verification and the payment provider's authenticated status lookup; a frontend event alone never confirms payment. Handovers and reports check confirmed state. Repeated callbacks should not double-book revenue. Late captured payments on cancelled orders are flagged for review.

## Owner management

Every route below requires `owner`.

| Method/path | Body/query | Response / errors |
|---|---|---|
| GET `/owner/summary` | – | Today and lifetime counts, confirmed revenue |
| GET `/owner/categories` | – | All categories |
| POST `/owner/categories` | `{name}` | 201 category; 409 duplicate slug |
| PATCH `/owner/categories/:id` | `{name?,active?}` | Updated category |
| GET `/owner/menu` | – | Up to 250 menu items |
| POST `/owner/menu` | `{name,description,category,pricePaise,imageKey,available,active}` | 201 item |
| PATCH `/owner/menu/:id` | Partial menu fields | Updated item |
| DELETE `/owner/menu/:id` | – | Soft-deactivated item |
| GET `/owner/tables` | – | All tables and occupiedBy |
| POST `/owner/tables` | `{number,active}` | 201 table |
| PATCH `/owner/tables/:id` | `{number?,active?}` | Updated table |
| GET `/owner/offers` | – | All offers |
| POST `/owner/offers` | `{code,type,value,minimumPaise,expiresAt,active,comboPricePaise,comboItems}` | 201 offer |
| PATCH `/owner/offers/:id` | Partial offer fields | Updated offer |
| GET `/owner/staff` | – | Staff requests and statuses |
| PATCH `/owner/staff/:id` | `{approval:"approved"|"rejected"}` | Updated staff approval |
| GET `/owner/orders` | `status?`, `page?` | Paginated orders and customer profile |
| PATCH `/owner/orders/:id/status` | `{status:"Accepted"|"Cancelled"}` | Transition if valid; 409 otherwise |
| POST `/owner/orders/:id/confirm-cash` | – | Confirm physical cash collection, 409 wrong method/state |
| GET `/owner/reports` | `from=YYYY-MM-DD&to=YYYY-MM-DD` | Confirmed revenue, daily sales, payment method, popular items |
| GET `/owner/reports/csv` | Same date filters | CSV (safe against spreadsheet formula injection) |

`value` is an integer *percentage* for percent offers, and integer *paise* for fixed discounts. A combo uses `comboItems` (menuItem/quantity) and `comboPricePaise` as the total package price. Active offers must have unexpired dates and meet minimum cart totals.

## Kitchen

All kitchen routes require `owner` or approved `staff`. Staff accounts with approval pending/rejected cannot authenticate to these routes.

| Method/path | Body | Response / errors |
|---|---|---|
| GET `/kitchen/orders` | – | Accepted, Preparing and Ready orders eligible for kitchen |
| PATCH `/kitchen/orders/:id/status` | `{status:"Preparing"|"Ready"}` | Transition Accepted→Preparing, Preparing→Ready; 409 invalid |
| POST `/kitchen/orders/:id/handover` | `{otp:"123456"}` | Complete Ready+paid order, invalidate OTP and release table | 400 bad/expired OTP, 429 attempts exhausted, 409 unpaid/not Ready |

## HTTP status conventions

- `200` normal success, `201` resource created.
- `400` invalid JSON/schema/cart/OTP/signature, `401` login missing/expired, `403` insufficient role/CSRF, `404` inaccessible/not found, `409` state conflict, `429` rate limited, `500` server failure, `503` provider configuration missing.
- Server errors do not return internal stack traces.

## Polling and order status

`orders.html` refreshes about every 20 seconds; the kitchen board does too. These are simple HTTP GETs rather than WebSockets, which fits a small college deployment.

## Version 1.2 endpoints and data fields

| Method | Path | Access | Result |
|---|---|---|---|
| GET | `/payment-options` | Public | `{onlineAvailable,mode}`; only `test` mode enables online choices; never returns keys |
| GET | `/menu-images/:id` | Public | `image/jpeg` bytes from `MenuPhoto` in MongoDB or 404 |
| POST | `/owner/menu/:id/image` | Owner + CSRF | Raw request `Content-Type: image/jpeg` (max 350 KB), `{imageVersion}` |
| DELETE | `/owner/menu/:id/image` | Owner + CSRF | Removes custom photo, returns to illustration |

Product JSON retains `imageKey` and adds `imageVersion` (default 0). For `imageVersion > 0`, clients fetch `/api/menu-images/<id>?v=<imageVersion>`. Older records without this field still use the built-in illustration. Photos are stored as binary in the separate MongoDB `MenuPhoto` collection, not Render's ephemeral filesystem.

For newly captured Razorpay payments the Order `gatewayMethod` field records the actual method returned by Razorpay. Older orders continue to fall back to their originally selected `paymentMethod`; reports use the gateway method when available. Razorpay Checkout may offer more methods than the original UPI/Card preference.


## Version 1.3 — customer loyalty APIs

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/owner/customers?page=1&limit=15&q=&segment=all` | Owner | Search/paginate customers with weekly and lifetime paid-order stats |
| GET | `/api/owner/customers?segment=regular` | Owner | Return only customers with >= 5 paid, completed orders in rolling 7 days |
| GET | `/api/owner/customers/:id` | Owner | Selected customer's profile, summary and 25 most recent orders |
| GET | `/api/owner/customers/lookup?q=` | Owner | Up to 100 active customers for targeted-offer selection |
| POST | `/api/owner/offers` | Owner | Create a public, selected or regular discount |
| PATCH | `/api/owner/offers/:id` | Owner | Update audience, eligible accounts and existing offer fields |
| GET | `/api/offers` | Public | Public active offers only; excludes private codes |
| GET | `/api/offers/mine` | Customer | Public + that account's eligible targeted/regular offers |
| POST | `/api/orders/preview` | Customer | Re-check target eligibility and calculate totals |
| POST | `/api/orders` | Customer | Re-check target eligibility when placing final order |

`POST /api/owner/offers` accepts existing fields plus `audience: "all" | "selected" | "regular"` and `eligibleCustomers: ["24-character-user-id"]`. Audience `selected` requires 1–100 unique, active customer IDs. Other audience types ignore eligibleCustomers. Existing offers without `audience` are treated as public. A different customer gets HTTP 403 at checkout for a selected-only coupon. All non-GET API calls use the existing CSRF header/cookie.
