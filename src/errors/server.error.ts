import { AppError } from "./app-error.js";
export class ServerError extends AppError{
    constructor(message = "Internal Server Error", statusCode = 500){
        super(message, statusCode);
    }
}