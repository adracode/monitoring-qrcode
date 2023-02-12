import express from "express";
import sensors from "./sensors";
import qrcode from "./qrcode-generator";
import configSensors from "./config-sensors"
import configNames from "./config-names"
//import dev from "./dev";
import {getPublic} from "../utils/path";

const router = express.Router();

const sensorsStatic = express.static(getPublic("sensors"), {extensions:['html'], index: "sensor.html"});
router.use("/", sensorsStatic);
router.use("/sensors",
    sensorsStatic,
    sensors);
router.use("/qrcode",
    express.static(getPublic("qrcode"), {extensions: ['html']}),
    qrcode);
router.use("/authentication",
    express.static(getPublic("authentication"), {extensions: ['html']}));
router.use("/config-sensors",
    express.static(getPublic("config-sensors"), {extensions: ['html'], index: "sensors.html"}),
    configSensors);
router.use("/config-names",
    express.static(getPublic("config-names"), {extensions: ['html'], index: "names.html"}),
    configNames);


//router.use("/dev", express.static(getPublic("dev")))
//router.use("/dev", dev);


export default router;