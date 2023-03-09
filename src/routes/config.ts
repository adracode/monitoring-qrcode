import express from "express";
import parser from "body-parser";

const router = express.Router();
const config = require("../controllers/config");

router.get("/", config.configPage);

router.get("/get-qrcodes", config.getQRCodes);

router.post("/set", parser.json(), config.setConfiguration);

router.post("/set-label", parser.json(), config.setTypeLabel);

router.post("/sensors", config.getAllSensors);

router.post("/generate", parser.json(), config.generateQRCode);

router.delete("/revoke", parser.json(), config.revokeQRCode);

router.post("/setting", parser.json(), config.setSetting)

router.post("/disconnect", parser.json(), config.disconnect);

export default router;
