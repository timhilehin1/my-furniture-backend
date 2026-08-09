import { AppError } from "./app-error.js";

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden", statusCode = 403){
        super(message, statusCode);
    }
}