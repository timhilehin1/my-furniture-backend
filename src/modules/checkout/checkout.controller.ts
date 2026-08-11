import type { FastifyRequest, FastifyReply } from "fastify";
import { checkout } from "./checkout.service.js";
import type { CheckoutInput } from "./checkout.schema.js";

export async function initiateCheckout(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.id;
   const body = request.body as CheckoutInput;
  const order = await checkout(userId, body);
  return reply.status(201).send({
    message: "Order successfully created",
    order,
  });
}
