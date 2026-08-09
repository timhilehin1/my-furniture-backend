import  { NotFoundError } from "../errors/not-found-error.js";
import { getProductsByIds } from "../modules/product/product.service.js";
import { prisma } from "./prisma.js";

export async function buildCart (userId:string){
const cartItems = await prisma.cart.findMany({
    where: {
      userId,
    },
  });
if (cartItems.length === 0) {
  return {
    items: [],
    subTotal: 0,
  };
}
  const productIds = cartItems.map((item) => item.productId);
  const products = await getProductsByIds(productIds);
  const productMap = new Map(
    products.map((product) => [product._id, product])
  );
  const mergedItems = cartItems.map((cartItem) => {
    const product = productMap.get(cartItem.productId);
    if (!product) {
      throw new NotFoundError(`Product ${cartItem.productId} not found.`);
    }
    let unitPrice: number;
    if (product.discountStatus) {
      if (product.discountPrice === undefined) {
        throw new NotFoundError(
          `Discount price is missing for product ${product._id}.`
        );
      }
      unitPrice = product.discountPrice;
    } else {
      unitPrice = product.productPrice;
    }
    const lineTotal = unitPrice * cartItem.quantity;
    return {
      ...cartItem,
      product,
      unitPrice,
      lineTotal,
    };
  });

  const subTotal = mergedItems.reduce((total, item) => {
    return total + item.lineTotal;
  }, 0);

  return {
    items: mergedItems,
    subTotal,
  };
}