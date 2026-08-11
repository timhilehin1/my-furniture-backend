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
- **M1 order hardening.** `buildCart` partitions available from unavailable items instead of failing
  the whole cart; per-item `availabilityStatus`; empty-cart and unavailable-item guards on checkout;
  delivery snapshot (address, phone, email) required and frozen on `Order`; body validation on
  `POST /checkout`; one-pending-order-per-user enforced by a partial unique index; `EXPIRED`,
  `FAILED` and `REFUNDED` statuses added

**In progress**
- Nothing — M1 is closed, next session starts M2

**Next (see Timeline)**
- M2 inventory + payment init → M3 webhook → M4 read endpoints + deploy

**Parked (v2 — deliberately not doing these now)**
- Frontend wiring · reconciliation job · order expiry · confirmation emails · cancellation and
  refunds · admin status transitions · live Sanity→Postgres inventory sync · stock reservations ·
  automated tests · rate limiting

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
- **Sanity doesn't enforce that a discounted product has a discount price.** A product can be saved
  with `discountStatus: true` and no `discountPrice`. `buildCart` warns and falls back to
  `productPrice`, so the storefront shows a sale badge and the customer is charged full price. Add a
  required-when rule to the Sanity product schema — and keep the backend guard regardless, since the
  rule only validates documents on save and won't touch the ones that already exist.
- `src/server.ts` hardcodes port 4000. Hosts inject a `PORT` env var — this must read it before M4.
- `server.ts` imports `dotenv/config` but `dotenv` isn't in `package.json` dependencies; it currently
  resolves transitively, which will break on a clean install.

**Resolved**
- `buildCart` no longer 404s the entire cart over one missing product. It partitions into
  `items` + `unavailableItems`, each unavailable entry tagged with a `reason`
  (`"DELETED"` / `"OUT_OF_STOCK"`), so the caller decides policy rather than the helper.
- `availabilityStatus` is now checked per item in `buildCart` and routed to `OUT_OF_STOCK`.
- An empty cart returns `{ items: [], subTotal: 0, unavailableItems: [] }` instead of throwing 404 —
  a new user viewing an empty cart is not an error.
- `POST /checkout` now refuses a cart containing unavailable items with a 409 rather than silently
  creating an order for a subset of it, and an empty cart returns `BadRequestError` rather than 404.
  The unavailable check runs **before** the empty check, so a cart whose products have all been
  deleted reports "review your cart" rather than the misleading "cart is empty".
- `POST /checkout` validates its body. `checkoutSchema` is attached to the route as `schema.body`,
  so the `as CheckoutInput` cast in the controller is now backed by a real runtime check rather
  than being a promise nothing keeps.
- Orders carry a delivery snapshot. `shippingAddress`, `shippingCity`, `shippingState`,
  `shippingCountry`, `phone` and `email` are required columns on `Order`, supplied in the checkout
  request body and frozen at creation — deliberately copied rather than related to the profile, so a
  later address change can't rewrite where a past order was sent.
- Cart rows snapshot the product's name and image at add-to-cart time (`Cart.productName`,
  `Cart.imageUrl`, written by `addToCart`), mirroring what `OrderItem` already does. Display fields
  only — price is never snapshotted here, so a stale row can mislabel an item but can never
  mischarge one.
- A user can hold only one `PENDING` order at a time. Enforced by a hand-written partial unique
  index (`prisma/migrations/…_one_pending_order_per_user`) — `CREATE UNIQUE INDEX … ON "Order"
  ("userId") WHERE status = 'PENDING'` — because Prisma's schema language can't express a filtered
  index, and an application-level check alone loses to a concurrent request. Read the SQL of future
  generated migrations: Prisma can't see this index in `schema.prisma` and may try to drop it.
- The losing side of a concurrent checkout gets a 409, not a 500. `checkout` catches Prisma's
  `P2002` around `order.create` and throws the same `ConflictError` its `findFirst` check does, so
  the message is identical however the duplicate was caught. Note that this Prisma version (7.8 with
  the `PrismaPg` adapter) reports **no `meta.target`** — the constraint name lives only in an
  untyped, adapter-specific nested field — so the check narrows on `meta.modelName === "Order"`,
  which is unambiguous only while `Order` has exactly one unique constraint.
- `error-handler.ts` maps any unhandled `P2002` to a generic 409 rather than letting it fall through
  to a 500. A duplicate is a client conflict, not a server failure. Prisma's raw message names
  tables and columns, so it's logged and not returned.
- `OrderStatus` gained `EXPIRED`, `FAILED` and `REFUNDED`.
- `src/lib/prisma.ts` no longer logs `DATABASE_URL` to stdout.
- Redundant `@default(now())` removed from `updatedAt` on `User` and `Cart`; all four models now
  read the same.
- **Version control exists.** The project is now a git repo — there is an undo.

---

## Timeline

Target: **Mon 10 Aug → Sun 6 Sep 2026**, ~5 hrs/week (~20 hours). No buffer week, so the scope below
is the whole scope.

| | Week | Milestone | Done when |
|---|---|---|---|
| **M1** ✅ | Aug 10–16 | **Docs + order hardening.** Docs in one ~2hr sitting, then: empty-cart guard, address/contact snapshot on orders, per-item availability in `buildCart`, duplicate-checkout protection, new statuses | ✅ Done 11 Aug. Checkout can't produce a ₦0, nonsense, unshippable or duplicated order |
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
