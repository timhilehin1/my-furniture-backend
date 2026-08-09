import type { FastifyRequest, FastifyReply } from "fastify";
import { checkout } from "./checkout.service.js";

export async function initiateCheckout(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.id;
  const order = await checkout(userId);
  return reply.status(201).send({
    messsage: "Order successfully created",
    order,
  });
}
