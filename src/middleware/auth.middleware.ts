import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken } from "../services/jwt.service.js";
import { prisma } from "../lib/prisma.js";
import { UnauthorizedError } from "../errors/unauthorized-error.js";


export async function  authMiddleware(request: FastifyRequest, reply: FastifyReply, ) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
           throw new UnauthorizedError("Authorization header is missing");
        }  
        const [scheme, token] = authHeader.split(" ");
        if (scheme !== "Bearer" || !token) {
            throw new UnauthorizedError("Invalid authorization header format");
        }
        const payload = verifyToken(token);
       
        const user = await prisma.user.findUnique({
            where:{ id: payload.id }
        })
         
        if(!user){
            throw new UnauthorizedError("Invalid token: user not found");
        }
        request.user = user;
    } 
   catch (error) {
  if (error instanceof Error) {
    switch (error.name) {
      case "TokenExpiredError":
        throw new UnauthorizedError("Token has expired");

      case "JsonWebTokenError":
        throw new UnauthorizedError("Invalid token");

      default:
        throw new UnauthorizedError(error.message);
    }
  }

  throw new UnauthorizedError("Unauthorized");
}   }