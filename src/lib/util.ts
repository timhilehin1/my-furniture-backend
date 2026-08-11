import { getProductsByIds } from "../modules/product/product.service.js";
import { prisma } from "./prisma.js";
import type { Cart } from "../generated/prisma/client.js";
import type { MergedItem, UnavailableItem } from "../interfaces/cart.js";

export async function buildCart(userId: string) {
  const cartItems = await prisma.cart.findMany({
    where: {
      userId,
    },
  });
  if (cartItems.length === 0) {
    return { items: [], subTotal: 0, unavailableItems: [] };
  }
  const productIds = cartItems.map((item) => item.productId);
  const products = await getProductsByIds(productIds);
  const productMap = new Map(products.map((product) => [product._id, product]));
  const mergedItems: MergedItem[] = [];
  const unavailableItems: UnavailableItem[] = [];
  for (const cartItem of cartItems) {
    const product = productMap.get(cartItem.productId);
    if (!product) {
      unavailableItems.push({ ...cartItem, reason: "DELETED" });
      continue;
    }
    if (!product.availabilityStatus) {
      unavailableItems.push({ ...cartItem, reason: "OUT_OF_STOCK" });
      continue;
    }
    let unitPrice: number;
    if (product.discountStatus && product.discountPrice === undefined) {
      console.warn(
        `Product ${product._id} has a discount status of true with a discount price of ${product.discountPrice}`,
      );
    }
    if (product.discountStatus && product.discountPrice !== undefined) {
      unitPrice = product.discountPrice;
    } else {
      unitPrice = product.productPrice;
    }

    const lineTotal = unitPrice * cartItem.quantity;
    mergedItems.push({ ...cartItem, product, unitPrice, lineTotal });
  }

  const subTotal = mergedItems.reduce((total, item) => {
    return total + item.lineTotal;
  }, 0);

  return {
    items: mergedItems,
    subTotal,
    unavailableItems,
  };
}
