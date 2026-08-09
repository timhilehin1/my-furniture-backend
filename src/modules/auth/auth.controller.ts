import type { FastifyReply, FastifyRequest } from "fastify";
import { loginUser, registerUser } from "./auth.service.js";
import type { LoginUserInput, RegisterUserInput } from "./auth.schema.js";

export async function register(
  request: FastifyRequest<{ Body: RegisterUserInput }>,
  reply: FastifyReply,
) {
  const body = request.body;
  const user = await registerUser(body);
  return reply.status(201).send({
    message: "User registered successfully",
    user,
  });
  // resposible for collectig http  request and sending it to service, so in some way they are connected to each other, understanding of functions relations is very needed here

  // so without await, will be getting a promise instead of the json returned by the function
  // okay then it says pause this function until the promise reolves completely then give me the actual valuea p
}

export async function login(
  request: FastifyRequest<{ Body: LoginUserInput }>,
  reply: FastifyReply,
) {
  const body = request.body;
  const user = await loginUser(body);
  return reply.status(200).send({
    message: "User logged in successfully",
    user,
  });
}
