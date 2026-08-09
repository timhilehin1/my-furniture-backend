import { AppError } from "./app-error.js";

export class NotFoundError extends AppError{
    constructor(message = "Not Found", statusCode = 404){
        super(message, statusCode);
    }
}