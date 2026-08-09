import Fastify from "fastify";
import { authRoutes } from "./modules/auth/auth.routes.js";
import jwt from "@fastify/jwt";
import {
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { registerErrorHandler } from "./errors/error-handler.js";
import { profileRoutes } from "./modules/profile/profile.routes.js";
import { CartRoutes } from "./modules/cart/cart.routes.js";
import { checkoutRoutes } from "./modules/checkout/checkout.routes.js";

export const app = Fastify({
    logger : true
})
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.register(jwt, {secret: process.env.JWT_SECRET || "default_secret"});
registerErrorHandler(app);
app.register(authRoutes, {prefix:"/auth"})
app.register(profileRoutes)
app.register(CartRoutes)
app.register(checkoutRoutes)