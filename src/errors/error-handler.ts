import type { FastifyInstance } from "fastify";
import { AppError } from "./app-error.js";
import type { FastifyError } from "fastify";
import { Prisma } from "../generated/prisma/client.js";
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        message: error.message,
      });
    }
    if (error.validation) {
      return reply.status(400).send({
        message: "Validation failed",
        issues: error.validation.map((v) => ({
          field: v.instancePath.replace("/", ""),
          message: v.message,
        })),
      });
    }

    // Fallback for unique-constraint violations no route handled itself.
    // A duplicate is the client's conflict, not a server failure, so it should
    // never surface as a 500. Prisma's own message names tables and columns —
    // log that, send something generic.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      request.log.error(error);
      return reply.status(409).send({
        message: "That record already exists.",
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    request.log.error(error);

    return reply.status(500).send({
      message: "Internal Server Error",
    });
  });
}
