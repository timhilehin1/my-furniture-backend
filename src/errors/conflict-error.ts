import { AppError } from "./app-error.js";

export class ConflictError extends AppError{
    constructor(message = "Conflict", statusCode = 409){
        super(message, statusCode);
    }
}