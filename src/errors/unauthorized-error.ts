import { AppError } from "./app-error.js";

export class UnauthorizedError extends AppError{
    constructor(message = "Unauthorized", statusCode = 401){
        super(message, statusCode);
    }
}