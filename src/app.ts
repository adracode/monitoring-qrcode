import express from "express";
import dotenv from "dotenv";
import routes from "./routes";
import fs from "fs"
import {Sensor} from "./services/sensor";

const app = express();
app.set("view engine", "ejs");
app.use(routes);

dotenv.config();
try {
    Object.entries(JSON.parse(fs.readFileSync("config.json", "utf-8")))
        .forEach(([id, setting]) => Sensor.setSetting(id, setting));
} catch (e) {
    console.log(e)
    console.error("Can't load settings file, using default values.")
}

export default app;