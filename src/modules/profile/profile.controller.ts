import type { FastifyRequest, FastifyReply } from "fastify";
import { getUserProfile } from "./profile.service.js";

export async function profile(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.id;
    const user = await getUserProfile({ id: userId });
    return reply.status(200).send({
        message: "User profile retrieved successfully",
        user,
    });
}