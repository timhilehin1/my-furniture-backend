import type { FastifyRequest, FastifyReply } from "fastify";
import { ZodType } from "zod";

export function validate(schema:ZodType){
    return async function (    request: FastifyRequest,
    reply: FastifyReply) {
    const response = schema.safeParse(request.body);
    if(!response.success){
        return reply.status(400).send({
            message: "Invalid request body",
            errors: response.error.format()
        })
    }
    request.body = response.data;
    //if the response is successful, asssign the response from zod to the request body, so that the controller can use it
}
}