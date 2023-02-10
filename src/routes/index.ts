import express from "express";
import sensors from "./sensors";
import qrcode from "./qrcode-generator";
import configSensors from "./config-sensors"
import configNames from "./config-names"
//import dev from "./dev";
import {getPathPage} from "../utils/path";

const router = express.Router();

const sensorsStatic = express.static(getPathPage("sensors"), {extensions:['html'], index: "sensor.html"});
router.use("/", sensorsStatic);
router.use("/sensors", sensorsStatic);
router.use("/sensors", sensors);
router.use("/qrcode", express.static(getPathPage("qrcode"), {extensions: ['html']}));
router.use("/qrcode", qrcode);
router.use("/authentication", express.static(getPathPage("authentication"), {extensions: ['html']}));
router.use("/config-sensors", express.static(getPathPage("config-sensors"), {extensions: ['html'], index: "sensors.html"}));
router.use("/config-sensors", configSensors);
router.use("/config-names", express.static(getPathPage("config-names"), {extensions: ['html'], index: "names.html"}));
router.use("/config-names", configNames);


//router.use("/dev", express.static(getPathPage("dev")))
//router.use("/dev", dev);


export default router;