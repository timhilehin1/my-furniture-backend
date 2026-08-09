import jwt from "jsonwebtoken";
import type { AccessTokenPayload } from "../types/jwt.js";
import { UnauthorizedError } from "../errors/unauthorized-error.js";

export function generateToken(userId: string) {
    return jwt.sign(
        {
            id: userId,
        },
        process.env.JWT_SECRET!,
        {
            expiresIn: "30m",
        }
    );
}

export function verifyToken(token: string) {
    try{
   const payload =  jwt.verify(token, process.env.JWT_SECRET!) as AccessTokenPayload;
   return payload;
    }catch (error) {
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
    }

}