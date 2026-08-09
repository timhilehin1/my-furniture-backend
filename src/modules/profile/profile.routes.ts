import type { FastifyInstance } from "fastify";
import { profileSchema } from "./profile.schema.js";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { profile } from "./profile.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

export async function profileRoutes(app:FastifyInstance){
   app.withTypeProvider<ZodTypeProvider>().get("/profile",{

    preHandler:[authMiddleware]
   },
   profile
)
}