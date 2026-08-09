import "dotenv/config";
import { app } from "./app.js";

const start = async()=>{
    try{
        await app.listen({
           port:4000,
           host: "0.0.0.0"
        });
        console.log("Server is running on port 4000");
    } catch (err) {
        console.error("Error starting server:", err);
        process.exit(1);
    }
};
start();