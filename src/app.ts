import express from "express";
import dotenv from "dotenv";
import {InfluxDB} from "influx";
import routes from "./routes";

const app = express();
app.use(routes);

dotenv.config();


export default app;