# Decisions log

One entry per decision: what, why, and what was rejected. **Add an entry whenever you hesitate over a
choice for more than ten minutes** — the reasoning is the expensive part, and it's what evaporates
when you step away from the project.

Newest at the bottom.

---

## 001 — Postgres for state, Sanity for catalogue

**Date:** 2026-07 (recorded retroactively, 2026-08-09)

Product content stays in Sanity; users, carts, orders, inventory and payments live in Postgres. Cart
rows store only a Sanity `productId`, and the two are merged in memory at request time by `buildCart`.

**Why:** they're different kinds of truth. Catalogue data is edited constantly by people and is
harmless when slightly stale. Money and state must be transactional, consistent under concurrency,
and referentially intact — a CMS gives you none of that.

**Rejected:** mirroring the full product catalogue into Postgres. It would mean a sync problem on
every content edit, for no benefit while the frontend still reads Sanity directly for browsing.

**Consequence:** there is no `Product` table, and `OrderItem` copies product data in at creation
time so orders remain historical records.

---

## 002 — Paystack as the payment provider

**Date:** 2026-08-09

**Why:** naira-native, test keys available immediately, clean webhook model with HMAC signature
verification. It's the provider this storefront would actually use in production, so the integration
is real rather than academic.

**Rejected:** Stripe (better docs and a CLI that replays webhooks to localhost, but live payouts to
NG are restricted, so the learning wouldn't transfer to a real launch). Flutterwave (equivalent
shape, rougher docs). A hand-rolled mock provider (cleaner for learning the flow in isolation, but
it means doing the integration twice).

---

## 003 — Inventory lives in Postgres, not Sanity

**Date:** 2026-08-09

Stock quantity is a Postgres column keyed by Sanity product id, seeded from Sanity by a one-off
script.

**Why:** stock has to be decremented **atomically**. The decrement must be conditional — reduce by N
only where stock ≥ N — and must happen inside the same transaction that marks the order paid, so two
customers can never both buy the last unit. Sanity offers no transactions and no locking, so
overselling would be a matter of timing.

**Rejected:** adding a quantity field in Sanity and mutating it from the backend (simpler mentally,
but guarantees oversells under concurrency). Availability-boolean only (fastest, but skips the entire
concurrency lesson, which is the most valuable thing in this project).

**Consequence:** a sync question — Sanity remains the source of truth for *which products exist*,
Postgres for *how many are left*. Live sync is parked for v2; a manual re-run of the seed script is
acceptable for now.

---

## 004 — Decrement stock on payment, not at checkout

**Date:** 2026-08-09

Stock is checked at checkout but only decremented when the webhook confirms payment.

**Why:** the correct marketplace pattern is to *reserve* stock at checkout with a TTL and convert the
reservation on payment. That requires a reservations table, an expiry job, and release-on-failure
logic — several weeks at 5 hrs/week, and the ship date is 6 Sep.

**Rejected:** full reservations (correct, but doesn't fit the timeline).

**Consequence — accepted knowingly:** two customers can both reach the Paystack page for the last
unit. The second payment succeeds at Paystack but fails the conditional decrement, and must be
refunded. This is a **named limitation**, documented in the README, not an oversight. Reservations
are top of the v2 list.

---

## 005 — Money is stored in minor units (kobo)

**Date:** 2026-08-09

All money columns are integers in the smallest currency unit. No floats, anywhere, ever.

**Why:** floating point cannot represent decimal currency exactly, and rounding errors in money are
the kind of bug that's invisible until it's expensive. Paystack also charges in kobo, so storing
minor units removes a conversion at the boundary.

**⚠️ OPEN — resolve in M2 before touching Paystack:** it is not yet confirmed whether Sanity's
`productPrice` is expressed in naira or kobo. If it's naira, a ×100 conversion is needed when
building the cart, and every existing order total is off by two orders of magnitude. Check the Sanity
data, decide, and record the answer here. A silent ×100 error is the classic first-payment bug.

---

## 006 — v1 ships without the frontend

**Date:** 2026-08-09

v1 = a deployed backend with a real Paystack payment proven end-to-end against the live URL, verified
with a Postman/Bruno collection. Frontend wiring is v2.

**Why:** the target date is 6 Sep at ~5 hrs/week — roughly 20 hours. Deploy plus frontend integration
plus payments doesn't fit, and a hard date only means something if the scope is cut to match it.
Wiring the frontend is a well-understood weekend's work once the API is live and documented; the
payment correctness work is not.

**Rejected:** keeping both and cutting depth everywhere (risked ending with two half-finished
things). Slipping to mid-September (rejected by preference — the date is the point).

**Consequence:** also cut — reconciliation, order expiry, emails, cancellation and refunds, admin
status transitions, automated tests, rate limiting. All listed in the README's parked section.

---

<!-- Next decision goes here. Number it, date it, say what you rejected. -->
