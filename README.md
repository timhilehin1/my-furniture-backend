# my-furniture-backend

A custom backend for a furniture storefront, built as a deliberate introduction to backend
engineering. The frontend already existed and fetched products straight from Sanity; this project
puts a real API in front of it — auth, carts, orders, inventory and payments — so that everything
which needs to be *transactional* lives in Postgres instead of a CMS.

It is a learning project, and the documentation is written accordingly: it explains **why** things
are the way they are, not just what they are.

---

## Architecture at a glance

```
   Frontend  ──────────────►  This API (Fastify)  ──────────►  Postgres
  (Next.js)                          │                        users · carts
      │                              │                        orders · order_items
      │                              │                        inventory · payments
      │                              ▼
      └──────────────────────►    Sanity  (catalogue: names, prices, images, copy)
         product browsing              ▲
                                       │
                                  Paystack ──► webhook ──► this API
```

**Why two datastores?** They hold different kinds of truth.

- **Sanity owns the catalogue.** Product names, descriptions, images, prices. Content people edit it
  freely; it changes often; nothing breaks if it's briefly stale.
- **Postgres owns money and state.** Users, carts, orders, inventory, payments. This data must be
  consistent, must survive concurrent writes, and must be correct to the kobo. A CMS gives you no
  transactions, no locking and no referential integrity — so none of this can live there.

Products are joined to cart rows **in memory at request time** (`src/lib/util.ts` → `buildCart`):
cart rows store only a Sanity `productId`, the product data is fetched from Sanity, and the two are
merged. That's why there's no `Product` table.

**One important consequence:** the moment an order is created, product data is **copied** into
`OrderItem` (name, slug, image, unit price). Orders are snapshots. If a price changes in Sanity
tomorrow, a past order must not change with it.

---

## Tech stack

| | |
|---|---|
| Runtime | Node.js, TypeScript 7, ESM |
| Framework | Fastify 5 |
| Database | PostgreSQL |
| ORM | Prisma 7 (`prisma-client` generator → `src/generated/prisma`) |
| Validation | Zod 4 via `fastify-type-provider-zod` |
| Auth | `@fastify/jwt` + `jsonwebtoken`, bcrypt |
| Catalogue | Sanity (`@sanity/client`) |
| Payments | Paystack *(in progress)* |
| Dev | `tsx watch` |

---

## Getting started

```bash
npm install
cp .env.example .env        # then fill in the values
npx prisma migrate dev      # create the schema
npx prisma generate         # regenerate the client into src/generated/prisma
npm run dev                 # http://localhost:4000
```

**Environment variables** — see `.env.example` for the full list. `DATABASE_URL`, `JWT_SECRET`, and
the three `SANITY_*` values are required today; the `PAYSTACK_*` keys land in week 2.

### Testing webhooks locally

Paystack has to reach your machine, which `localhost` doesn't allow. Expose it with a tunnel:

```bash
npx localtunnel --port 4000       # or: cloudflared tunnel --url http://localhost:4000
```

Then set the resulting HTTPS URL as the webhook URL in the Paystack dashboard
(Settings → API Keys & Webhooks), pointing at `/payments/webhook`. **This step is where everyone
gets stuck** — if webhooks aren't arriving, check the tunnel before you touch your code.

---

## Domain model

What each table means in business terms — the tables *are* the business model.

| Table | What it represents |
|---|---|
| `User` | A person who can log in. Holds a role (`ADMIN` / `CUSTOMER`) and loose location fields. |
| `Cart` | One row = one product a customer intends to buy, with a quantity. Unique on `(userId, productId)`, so adding twice increments rather than duplicating. Mutable, disposable, no money meaning. |
| `Order` | A customer's committed intent to buy, created at checkout **before** payment. Carries the status and the frozen totals. Immutable once created. |
| `OrderItem` | A line on an order, with product details **copied in** at creation time. This is what makes an order a historical record rather than a live query. |
| `Inventory` *(planned)* | Stock quantity per Sanity product id. Postgres owns this so decrements can be atomic and oversells impossible. |
| `Payment` *(planned)* | One attempt to pay for an order, keyed by the Paystack reference. One order can have many attempts — fail, retry, succeed. This is the audit trail for "I was debited". |

Order statuses: `PENDING → PAID → PROCESSING → SHIPPED → DELIVERED`, plus `CANCELLED`
(and `EXPIRED` / `FAILED` / `REFUNDED`, planned).

---

## The money flow

**Read this first when you come back cold.** This is the sequence the whole project exists to get right.

```
1. POST /checkout
      Snapshot the cart into Order(PENDING) + OrderItems, with prices frozen.
      The order exists BEFORE any money moves.

2. POST /payments/init
      Server re-derives the amount from order.total (never trusts the client),
      asks Paystack to initialise a transaction, returns an authorization URL.

3. Customer pays on Paystack's hosted page.
      Card details never touch this server.

4. POST /payments/webhook   ◄── Paystack calls us. THIS is the source of truth.
      a. Verify the HMAC signature against the RAW request body.
      b. Verify the paid amount and currency match the order snapshot.
      c. If the order is already PAID → return 200 and do nothing (idempotency).
      d. Otherwise, in ONE transaction:
            Order.status = PAID
            decrement inventory (conditionally: only where stock >= quantity)
            clear the customer's cart
            write the Payment row
      e. Return 200 quickly, or Paystack will retry.

5. GET /orders/:id
      The customer sees the result. Scoped to their own userId.
```

### The three rules that make this safe

1. **The frontend's "payment successful" redirect is a UI event, not a fact.** Anyone can visit that
   URL. Only a signed webhook — or a server-side call to Paystack's verify endpoint — may move an
   order to `PAID`.
2. **The webhook will be delivered more than once.** Paystack retries on any non-2xx response and
   sometimes duplicates outright. A non-idempotent handler decrements stock twice for one payment.
3. **Never trust a client-supplied amount.** Re-derive it from `order.total` on the way out, and
   re-verify it on the way back in. A mismatch means don't mark it paid.

### Why the order is created before payment

If orders were only created after successful payment, a customer who pays while the server is down
would have money gone and nothing to point at. The `PENDING` order is the paper trail that makes
that situation recoverable.

---

## API reference

All authenticated routes expect `Authorization: Bearer <accessToken>`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | — | Create an account |
| POST | `/auth/login` | — | Returns access token + user summary |
| GET | `/profile` | ✓ | Current user's profile |
| POST | `/cart` | ✓ | Add a product (increments if already present) |
| GET | `/cart` | ✓ | Cart with Sanity product data merged in, plus subtotal |
| PUT | `/cart/:productId` | ✓ | Set quantity |
| DELETE | `/cart/:productId` | ✓ | Remove one item |
| DELETE | `/cart` | ✓ | Empty the cart |
| POST | `/checkout` | ✓ | Snapshot cart → `Order(PENDING)` |
| POST | `/payments/init` | ✓ | *Planned* — returns a Paystack authorization URL |
| POST | `/payments/webhook` | signature | *Planned* — Paystack → server. Raw body required |
| GET | `/orders` | ✓ | *Planned* — paginated order history |
| GET | `/orders/:id` | ✓ | *Planned* — must filter by `id` **and** `userId` |

---

## Status board

_Update this at the end of every session — even a bad one. Two minutes here is the entire fix for
losing the thread._

**Done**
- Auth: register, login, bcrypt hashing, JWT issuing and verification
- Custom error classes extending a base `AppError`, wired to a Fastify error handler
- Auth + authorize middleware, Zod validation on routes
- Profile endpoint
- Cart: add / read / update / delete one / delete all, with Sanity product merge and subtotal
- Checkout: cart snapshotted into `Order` + `OrderItem` with frozen prices

**In progress**
- Nothing yet — next session starts M1 below

**Next (see Timeline)**
- M1 order hardening → M2 inventory + payment init → M3 webhook → M4 read endpoints + deploy

**Parked (v2 — deliberately not doing these now)**
- Frontend wiring · reconciliation job · order expiry · confirmation emails · cancellation and
  refunds · admin status transitions · live Sanity→Postgres inventory sync · stock reservations ·
  automated tests · rate limiting · version control

---

## Known limitations & open issues

Named on purpose. An unnamed gap is a bug; a named one is a decision.

**Deliberate cuts for v1**
- **No stock reservations.** Stock is decremented on payment confirmation, not held at checkout. Two
  customers can both reach the Paystack page for the last unit; the second one's payment will fail
  the conditional decrement and needs a refund. The correct fix is a reservation with a TTL — that's v2.
- **No reconciliation.** If the server is down when the webhook arrives, the order strands in
  `PENDING` with the customer's money taken. Nothing repairs that automatically yet.
- No order expiry, so abandoned `PENDING` orders live forever.
- No confirmation email — the customer has no receipt.
- `subtotal` and `total` are always equal: no shipping fees, no tax, no discount codes.
- No guest checkout. Carts are keyed by `userId`.
- No automated tests. `npm test` is still the default error stub; the Postman/Bruno collection is the
  regression suite for now.

**Open issues in the current code**
- `loginUser` returns the **access token as the refresh token** — refresh isn't implemented, it just
  looks like it is (`src/modules/auth/auth.service.ts`).
- `POST /checkout` with an empty cart creates a ₦0 order with no items (`src/lib/util.ts` returns an
  empty cart and checkout proceeds anyway). *Fix in M1.*
- `buildCart` throws a 404 for the **entire cart** if any one product is missing from Sanity, leaving
  the customer stuck with no way to remove it. *Fix in M1.*
- `availabilityStatus` is fetched from Sanity and never checked. *Fix in M1.*
- Orders carry no shipping address, phone or email — unfulfillable as-is. *Fix in M1.*
- `src/lib/prisma.ts` logs `DATABASE_URL`, password included, to stdout on every boot. Remove before
  deploying.
- `src/server.ts` hardcodes port 4000. Hosts inject a `PORT` env var — this must read it before M4.
- `server.ts` imports `dotenv/config` but `dotenv` isn't in `package.json` dependencies; it currently
  resolves transitively, which will break on a clean install.
- `User.updatedAt` has both `@default(now())` and `@updatedAt`, which is redundant.
- **No version control.** There is no git repo, so there is no undo. Parked by choice.

---

## Timeline

Target: **Mon 10 Aug → Sun 6 Sep 2026**, ~5 hrs/week (~20 hours). No buffer week, so the scope below
is the whole scope.

| | Week | Milestone | Done when |
|---|---|---|---|
| **M1** | Aug 10–16 | **Docs + order hardening.** Docs in one ~2hr sitting, then: empty-cart guard, address/contact snapshot on orders, per-item availability in `buildCart`, duplicate-checkout protection, new statuses | Checkout can't produce a ₦0, nonsense, or unshippable order |
| **M2** | Aug 17–23 | **Inventory + payment init.** Stock quantity in Postgres seeded by a one-off script, out-of-stock rejection at checkout, `Payment` model, `POST /payments/init` | The returned URL opens a real Paystack page for the right amount in kobo |
| **M3** | Aug 24–30 | **The webhook.** Raw-body route, HMAC verification, amount + currency check, idempotent handler, and the one transaction (status + stock + cart clear). Budget the whole week | A test card drives `PENDING → PAID`, stock drops exactly once, cart empties |
| **M4** | Aug 31–Sep 6 | **Read endpoints + deploy.** Paginated order history, owner-scoped order detail, hosted Postgres, deploy, live webhook URL, tests re-run against production | A real Paystack test payment succeeds against the live URL |

**Rules that keep the date real**

- One milestone at a time. Half-done M3 plus half-done M4 is worth nothing; M3 alone is worth a lot.
- Anything not in the table is v2. Write it in the parked list and move on.
- **Hard checkpoint Sun 30 Aug:** if the webhook isn't moving orders to `PAID` by then, don't absorb
  it into week 4 — deploy what works, ship on the 6th, finish it in v2. A deployed backend with a
  documented gap beats a perfect one that never went live.
- If a week slips, move the date by a week rather than compressing the next milestone.

---

## Verification

How you'll know payments actually work. Run these once M3 lands, then again against the deployed URL
in M4. These four tests are the real curriculum.

1. **Happy path.** Add to cart → checkout → init → pay with a Paystack test card → confirm the
   webhook fired. Assert: order `PAID`, stock down by exactly the quantity ordered, cart empty,
   `Payment` row written with the provider reference.
2. **Replay.** Re-send the identical webhook payload. Assert **nothing changed** — stock did not drop
   twice. This is the test that proves idempotency works.
3. **Tampering.** Send a webhook with a bad signature (must be rejected), then one with a valid
   signature but the wrong amount (must be rejected; order stays `PENDING`). If either passes, you
   have a free-money bug.
4. **Oversell.** Set stock to 1 and fire two payment confirmations concurrently. Exactly one order
   becomes `PAID`; the other fails cleanly and stock never goes negative. This is the hardest and
   most valuable thing in the project — watch what your transaction actually does.

Worth doing once for the lesson: kill the server between payment and webhook, and watch the order
strand in `PENDING` with the money gone. That stranded row is exactly what a reconciliation job
exists to repair — which is why it's top of the v2 list.

---

## Further reading

- [`DECISIONS.md`](DECISIONS.md) — why things are the way they are
- [`JOURNAL.md`](JOURNAL.md) — the running learning log
