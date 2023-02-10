import express from "express";
import dotenv from "dotenv";
import routes from "./routes";

const app = express();
app.set("view engine", "ejs");
app.use(routes);

dotenv.config();


export default app;