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

import { prisma } from "../../lib/prisma.js";
import { buildCart } from "../../lib/util.js";
import { getCart } from "../cart/cart.service.js";

//      └── Return Order
export async function checkout(userId: string) {
  const cart = await buildCart(userId);
  const order = await prisma.order.create({
    data: {
      userId,
      subtotal: cart.subTotal,
      total: cart.subTotal,
      orderItems: {
        create: cart.items.map((item ) => ({
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
  return order
}
