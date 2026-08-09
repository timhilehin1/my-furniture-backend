import type { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../errors/unauthorized-error.js";
import type { Role } from "../generated/prisma/enums.js";

export function authorize(allowedRoles: Role[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) {
            throw new UnauthorizedError("User not authenticated");
        }
        if (!allowedRoles.includes(request.user.role)) {
            throw new UnauthorizedError("Insufficient permissions");
        }
    };
}
