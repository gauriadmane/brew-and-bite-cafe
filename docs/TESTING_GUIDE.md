# Brew & Bite testing checklist

This guide separates **automated source tests** from **end-to-end tests that require real services**. Never record a test as passed without running it.

## Automated tests

```bat
npm ci
npm run check
npm test
npm audit
```

The supplied tests cover pricing in integer paise, HMAC signatures, static pages and navigation, checkout retry behaviour, loyalty eligibility, owner-only UI contracts and image validation. On the reviewed upload, **53 tests passed** with Node.js 22; these tests are mostly unit, mock and source-contract tests. They do not substitute for live Atlas/Razorpay/Render testing. Dependency installation and `npm audit` need to be run on your computer because npm registry installation was unavailable in the review environment.

## Local end-to-end verification

Use separate browser sessions for Customer, Owner and approved Staff, running `npm run dev` with a configured Atlas database.

| ID | Test | Expected outcome | Actual result |
| --- | --- | --- | --- |
| L01 | Register/login and logout as customer | Cookie session works; credentials validated | Record yourself |
| L02 | Register staff; attempt login before approval | Kitchen access denied | Record yourself |
| L03 | Owner approves staff | Approved staff may log in | Record yourself |
| L04 | Role-specific homepage, About/Profile/nav | Correct links and role information | Record yourself |
| L05 | Owner menu add/edit/deactivate and photo replacement | New menu item/image persists across refresh | Record yourself |
| L06 | Customer cart/search/filter | Quantities and totals are correct | Record yourself |
| L07 | Cash order placed at free table | Order Placed / payment Pending | Record yourself |
| L08 | Two orders request the same table | Second order receives 409 conflict | Record yourself |
| L09 | Owner accepts and kitchen prepares | Accepted → Preparing → Ready | Record yourself |
| L10 | Handover before cash confirmation | Blocked | Record yourself |
| L11 | Owner confirms cash, customer requests OTP | Payment Confirmed, 6-digit OTP valid for 5 min | Record yourself |
| L12 | Wrong/expired/reused OTP | Attempts controlled; cannot complete order | Record yourself |
| L13 | Correct OTP | Completed and table released | Record yourself |
| L14 | Receipt, CSV, sales dashboard | Confirmed revenue agrees with saved orders | Record yourself |
| L15 | Razorpay Test Mode success | Server verifies captured payment before confirmation | Record yourself |
| L16 | Gateway popup cancelled or test payment fails | Not recorded as paid; eligible order can retry | Record yourself |
| L17 | Selected-customer offer applied by target and unrelated customer | Target allowed; unrelated user rejected | Record yourself |
| L18 | Regular-customer offer with four versus five qualified orders in last seven days | Four rejected; five eligible | Record yourself |
| L19 | Customer attempts owner/customer-data APIs | HTTP 403; other customers' orders not readable | Record yourself |
| L20 | Mobile menu/cart/checkout/profile | No overlap; controls usable | Record yourself |

## After deployment

From a different phone/computer, check that HTTPS, images, registration, login cookies, MongoDB persistence and role pages all work. Run one successful cash order through OTP completion, then a Razorpay Test Mode payment after webhook configuration. Verify the webhook was delivered, payment captured, no duplicate revenue, and that a pending order does not become Confirmed simply because the popup closes. Check that secrets do not appear in browser pages, GitHub or Render logs.

**Limitations to disclose in your report:** Free Render cold starts, best-effort unpaid-order expiry while server sleeps, optional email/absent SMS, no actual card processing by the application, no automated refunds, and the fact that unit tests are not proof of full payment integration.
