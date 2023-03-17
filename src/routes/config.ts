import express from "express";
import parser from "body-parser";

const router = express.Router();
const config = require("../controllers/config");

router.get("/", config.configPage);

router.get("/qrcodes", config.getQRCodes);

router.post("/config", parser.json(), config.setConfiguration);

router.post("/label", parser.json(), config.setTypeLabel);

router.post("/sensors", config.getAllSensors);

router.post("/generate", parser.json(), config.generateQRCode);

router.post("/setting", parser.json(), config.setSetting);

router.post("/password", parser.json(), config.changePassword);

router.post("/disconnect", parser.json(), config.disconnect);

router.delete("/revoke", parser.json(), config.revokeQRCode);

export default router;
