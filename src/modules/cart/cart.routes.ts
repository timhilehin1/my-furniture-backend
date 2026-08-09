import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { addcartSchema, cartParamsSchema,  updateCartSchema } from "./cart.schema.js";
import {
  createCartItem,
  deleteAllCartItems,
  deleteSingleCartItem,
  getCartItems,
  updateCartItems,
} from "./cart.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

export async function CartRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/cart",
    {
      preHandler: [authMiddleware],
      schema: {
        body: addcartSchema,
      },
    },
    createCartItem,
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/cart",
    {
      preHandler: [authMiddleware],
    },
    getCartItems,
  );
  app.withTypeProvider<ZodTypeProvider>().put(
    "/cart/:productId",
    {
      preHandler: [authMiddleware],
      schema:{
        params:cartParamsSchema,
        body:updateCartSchema,
      }
    },
    updateCartItems,
  );
  app.withTypeProvider<ZodTypeProvider>().delete(
    "/cart/:productId",
    {
      preHandler: [authMiddleware],
        schema:{
        params:cartParamsSchema
      }
    },
    deleteSingleCartItem,
  );
  app.withTypeProvider<ZodTypeProvider>().delete(
    "/cart",
    {
      preHandler: [authMiddleware],
    },
    deleteAllCartItems,
  );
}
