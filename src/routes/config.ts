import express from "express";
import parser from "body-parser";

const router = express.Router();
const config = require("../controllers/config");

router.get("/", config.slash);

router.get("/get-qrcodes", config.slashGetQrCodes);

router.post("/set", parser.json(), config.slashSet);

router.post("/set-label", parser.json(), config.slashSetLabel);

router.post("/sensors", config.slashSensors);

router.post("/generate", parser.json(), config.slashGenerate);

router.delete("/revoke", parser.json(), config.slashRevoke);

router.post("/disconnect", parser.json(), config.slashDisconnect);

export default router;
