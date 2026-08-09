import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { initiateCheckout } from "./checkout.controller.js";
export async function checkoutRoutes(app:FastifyInstance){
 app.withTypeProvider<ZodTypeProvider>().post("/checkout", {preHandler:[authMiddleware]},initiateCheckout)
}