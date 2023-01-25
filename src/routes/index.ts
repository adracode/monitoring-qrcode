import express from "express";
import sensors from "./sensors";
import qrcode from "./qrcode-generator";
import {getPathPage} from "../utils/path";

const router = express.Router();

router.use("/", express.static(getPathPage("sensors"), {extensions:['html'], index: "sensor.html"}))
router.use("/sensors", sensors);
router.use("/qrcode", express.static(getPathPage("qrcode"), {redirect: false}))
router.use("/qrcode", qrcode)

export default router;