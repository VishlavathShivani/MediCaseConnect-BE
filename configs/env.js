// configs/env.js
import dotenv from "dotenv-flow";

dotenv.config();

console.log("=== ENV LOADED ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("==================");

export default process.env;