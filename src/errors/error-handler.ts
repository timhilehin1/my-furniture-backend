import type { FastifyInstance } from "fastify";
import { AppError } from "./app-error.js";
import type { FastifyError } from "fastify";
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

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    request.log.error(error);

    return reply.status(500).send({
      message: "Internal Server Error",
    });
  });
}
