import type { FastifyReply, FastifyRequest } from "fastify";
import { addToCart, deleteAllCart, deleteSingleCart, getCart, updateCart } from "./cart.service.js";
import type { CartInput, CartParams } from "./cart.schema.js";

export async function createCartItem(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = request.body as CartInput;
  const userId = request.user.id;
  const cartItem = await addToCart(body, userId);
  return reply.status(201).send({
    message: "Item successfully added to cart",
    cartItem,
  });
}

export async function getCartItems(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.id;
  const cartItems = await getCart(userId);
  return reply.status(200).send({
    message: "Cart Items retrieved successfully",
    cartItems,
  });
}

export async function updateCartItems(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const {productId} = request.params as CartParams;
  const {quantity} = request.body as CartInput
  const userId = request.user.id;
  const payload = {productId,quantity}
  const cartItem = await updateCart(payload, userId);
  return reply.status(200).send({
    message: "Item successfully updated",
    cartItem,
  });
}

export async function deleteSingleCartItem(request: FastifyRequest,
  reply: FastifyReply){
      const params = request.params as CartParams;
  const {productId} = params
  const userId = request.user.id;
  const cartItem = await deleteSingleCart(productId,userId)
    return reply.status(200).send({
    message: "Item successfully deleted",
    cartItem,
  });
}


export async function deleteAllCartItems(request: FastifyRequest,
  reply: FastifyReply){
      const userId = request.user.id;
  const cartItems = await deleteAllCart(userId);
  return reply.status(200).send({
    message: "Cart Items deleted successfully",
    cartItems,
  });
  }