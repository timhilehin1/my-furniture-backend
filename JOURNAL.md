# Learning journal

A running log of things learned while building this. Append one line at the end of every session —
even a bad one. Newest entries at the bottom.

---

## Pre-August 2026 (moved verbatim from the old `READ.MD`)

Pretty innteresting stuff so far, one thing i have particularly learnt is  that what lives insidetables are business models

I like idea of middlewares mehn, protect your routes, protect your handlers

you can extend the error class of a framework/ package, interesting so we are building our own error class, extending the base class and adding our error class

I CAN HAVE MULTIPLE INSTANCES of my base class, so the arguments in the calss, inside the constrcutor are what we use to define properties of that calss,
so something like

```ts
class car{
    constructor (public color:string){

    }
}
```

so when we are saying use Inheritannce, we are not necessarily saying that we should do away with the base class, we are saying use this base class as a template ad build upon it, slightly different than objects tbh - Inheritance

```ts
class Truck extends Car {
    constructor(color:string, publictowingcapacity:number){
        super(color)
    }
}
```

constructor is responsible for initializing the instancce of the class, that is why it receives argument and class super that says okay o, you can also build from the parent class, okay fairs, that's why we can get name from constructor.name

fastify is still like the major base guy

debugged profile endpoint successfully, really feel good about this

brrrrr jwt is nt fully sorted cuz i am catching the error in two places

only one user can have one cart, one to one

multiple carts can belong to one user = many to one

with zod you can use it to generate types from schema, instead of writing schemas then creating interfaces separately

ORMs - Prisma - It is excellent, wow

---

## 2026-08-09 — Picking the project back up

Came back after ~a week away and couldn't remember where the flow was going. Lost time re-reading my
own code to figure out what checkout actually did. **That's the cost of no documentation** — hence
this journal, the README, and `DECISIONS.md`.

Worked through the order → payment → fulfilment flow on paper before writing any code. The correction
that mattered: **the order is created before payment, not after.** I had it backwards in my head. The
`PENDING` order is the paper trail — if a customer pays and my server is down, without that row
there's money gone and nothing to point at.

Other things that clicked:

- **A cart is not an order.** The cart is a live query — it recalculates from Sanity every time you
  read it. The order is a *snapshot* — product name, image and price are copied in and frozen. That's
  why `OrderItem` duplicates data that "already exists" in Sanity. Duplication is the point.
- **Sanity has no quantity field.** I'd been saying "deduct from stock" without noticing there is no
  stock anywhere — only an `availabilityStatus` boolean I fetch and never read. Inventory has to live
  in Postgres, because that's the only place I can decrement atomically.
- **The webhook is the source of truth, not the redirect.** The frontend's "payment successful" page
  is just navigation. Anyone can visit that URL. Only a signed webhook may mark an order paid.
- Webhooks get delivered **more than once** — so the handler has to be idempotent, or a retry
  decrements stock twice for one payment.

Found in my own code while reviewing: `POST /checkout` on an empty cart happily creates a ₦0 order.
`buildCart` 404s the entire cart if one product is missing from Sanity. Orders have no address, so
nothing is actually shippable. All fixed in M1.

Set a hard ship date — **6 Sep 2026** — and cut frontend wiring, refunds, emails and reconciliation
to v2 to make it fit. Naming the cuts felt better than pretending I'd do everything.

---

<!-- Next entry goes here. Date it, keep it short, write it even when the session went badly. -->
