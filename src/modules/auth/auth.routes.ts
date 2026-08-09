import type { FastifyInstance } from "fastify";
import { login, register } from "./auth.controller.js";
import { validate } from "../../middleware/validate.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

export async function authRoutes(app: FastifyInstance) {
  // app.post("/register", {preHandler:validate(registerSchema)}, register)
  app.withTypeProvider<ZodTypeProvider>().post(
    "/register",
    {
      schema: {
        body: registerSchema,
      },
    },
    register,
  );

  app.withTypeProvider<ZodTypeProvider>().post("/login", {
    schema:{
        body:loginSchema
    }
  }, login)
}
