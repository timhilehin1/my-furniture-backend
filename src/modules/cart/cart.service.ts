import { BadRequestError } from "../../errors/bad-request-error.js";
import { NotFoundError } from "../../errors/not-found-error.js";
import { prisma } from "../../lib/prisma.js";
import { buildCart } from "../../lib/util.js";
import { getProductById, getProductsByIds } from "../product/product.service.js";
import type { CartInput, CartParams } from "./cart.schema.js";

export async function addToCart(data: CartInput, userId: string) {
  //check sanity if the product exists
  const productId = data.productId;
   const product = await getProductById(productId)
   if(!product){
    throw new NotFoundError (`Product ${productId} not found.`)
   }
  const existingItem = await prisma.cart.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });
  if (existingItem) {
    return prisma.cart.update({
      where: {
        id: existingItem.id,
      },
      data: {
        quantity: {
          increment: 1,
        },
      },
    });
  }

  return prisma.cart.create({
    data: {
      userId,
      productId,
      quantity: data.quantity ?? 1,
      productName: product.productName,
      imageUrl: product.productImages[0]?.url ?? null,
    },
  });
}

export async function getCart(userId: string) {
   return buildCart(userId)
}

export async function updateCart(data: CartInput, userId: string) {
  const productId = data.productId;
  const product = await getProductById(productId)
     if(!product){
    throw new NotFoundError (`Product ${productId} not found.`)
   }
  if (!data.quantity) {
    throw new BadRequestError("Invalid quantity");
  }
  if (data.quantity && data.quantity <= 0) {
    throw new BadRequestError("Invalid quantity");
  }
  const existingItem = await prisma.cart.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });
  if (!existingItem) {
    throw new NotFoundError("Product not found");
  } else {
    return prisma.cart.update({
      where: {
        id: existingItem.id,
      },
      data: {
        quantity: data.quantity ?? 1,
      },
    });
  }
}

export async function deleteSingleCart(productId: string, userId: string) {
     const product = await getProductById(productId)
     if(!product){
    throw new NotFoundError (`Product ${productId} not found.`)
   }
  const existingItem = await prisma.cart.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });
  if (!existingItem) {
    throw new NotFoundError("Product not found");
  }
  return prisma.cart.delete({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });
}

export async function deleteAllCart(userId: string) {
  const cartItems = await prisma.cart.deleteMany({
    where: {
      userId,
    },
  });
  return cartItems;
}
