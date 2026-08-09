import { AppError } from "./app-error.js";

export class BadRequestError extends AppError{
  constructor(message = "Bad Request", statusCode = 400){
    super(message, statusCode);
  }
}