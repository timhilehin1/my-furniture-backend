import type { Role } from "../generated/prisma/enums.js";

export interface AccessTokenPayload  {
    id: string;
}

export interface AuthUser {
    id: string;
    email: string;
    role: Role;
}

declare module "@fastify/jwt" {
    interface FastifyJWT {
        user: AuthUser;
    }
}