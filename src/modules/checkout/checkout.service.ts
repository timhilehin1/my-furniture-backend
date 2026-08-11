// Frontend
//      │
//      │ POST /checkout
//      ▼
// Backend
//      │
//      ├── Read userId from JWT
//      │
//      ├── Fetch cart from PostgreSQL
//      │
//      ├── Fetch products from Sanity
//      │
//      ├── Calculate prices
//      │
//      ├── Create Order
//      │

import { BadRequestError } from "../../errors/bad-request-error.js";
import { ConflictError } from "../../errors/conflict-error.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { buildCart } from "../../lib/util.js";
import type { CheckoutInput } from "./checkout.schema.js";

const PENDING_ORDER_MESSAGE =
  "You already have a pending order. Please complete or cancel it before placing a new one.";

//      └── Return Order
export async function checkout(userId: string, shippingDetails: CheckoutInput) {
  const cart = await buildCart(userId);
    if(cart.unavailableItems.length > 0){
    throw new ConflictError("Some products in the cart are no longer available. Please review your cart and try again.");
  }
  if (cart.items.length === 0) {
    throw new BadRequestError("Cart is empty");
  }

  // Friendly path: catches the ordinary "user clicks checkout again" case.
  // It cannot catch two concurrent requests — both can pass this check before
  // either inserts — so the one_pending_order_per_user index is the real guard.
  const existingPendingOrder = await prisma.order.findFirst({
    where: {
      userId,
      status: "PENDING",
    },
  });
  if (existingPendingOrder) {
    throw new ConflictError(PENDING_ORDER_MESSAGE);
  }

  try {
    const order = await prisma.order.create({
      data: {
        userId,
        subtotal: cart.subTotal,
        total: cart.subTotal,
        shippingAddress: shippingDetails.shippingAddress,
        shippingCity: shippingDetails.shippingCity,
        shippingState: shippingDetails.shippingState,
        shippingCountry: shippingDetails.shippingCountry,
        phone: shippingDetails.phone,
        email: shippingDetails.email,
        orderItems: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            productName: item.product.productName,
            productSlug: item.product.slug,
            imageUrl: item.product.productImages[0]?.url ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
    });
    return order;
  } catch (err) {
    // The losing side of a concurrent checkout: it passed the findFirst check
    // above, then lost the insert to one_pending_order_per_user.
    //
    // Narrowed on modelName because this Prisma version (7.8, PrismaPg adapter)
    // reports no meta.target — the constraint name only exists in an untyped,
    // adapter-specific nested field. Order has exactly one unique constraint
    // today, so modelName is unambiguous; revisit this if that stops being true.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      err.meta?.modelName === "Order"
    ) {
      throw new ConflictError(PENDING_ORDER_MESSAGE);
    }
    throw err;
  }
}
