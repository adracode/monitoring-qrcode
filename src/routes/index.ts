import express from "express";
import sensors from "./sensors";
import qrcode from "./qrcode-generator";
//import dev from "./dev";
import {getPathPage} from "../utils/path";

const router = express.Router();

router.use("/", express.static(getPathPage("sensors"), {extensions:['html'], index: "sensor.html"}))
router.use("/sensors", sensors);
router.use("/qrcode", express.static(getPathPage("qrcode"), {redirect: false}))
router.use("/qrcode", qrcode)

//router.use("/dev", express.static(getPathPage("dev")))
//router.use("/dev", dev);


export default router;