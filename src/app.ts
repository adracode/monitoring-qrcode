import express from "express";
import dotenv from "dotenv";
import influx, {InfluxDB} from "influx";
import routes from "./routes";

const app = express();
app.use(routes);
app.use(express.json());
app.use(express.static('public'));

dotenv.config();
export const influxDB = new InfluxDB({
    protocol: "https",
    host: process.env.INFLUXDB_HOST,
    port: 443,
    path: process.env.INFLUXDB_PATH,
    database: process.env.INFLUXDB_DATABASE,
    username: process.env.INFLUXDB_USERNAME,
    password: process.env.INFLUXDB_PASSWORD
});

export default app;