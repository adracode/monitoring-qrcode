import express from "express";
import parser from "body-parser";
import { Sensor } from "../services/sensor";
import { TokenManager } from "../services/token";

const router = express.Router();

router.post("/admin", parser.json(), async (req, res) => {
    console.log(req.body)
    var crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(req.body?.password).digest('hex');
    const hashPassword = Sensor.getSetting<string>("adminPassword")?.toLowerCase();
    if (hashPassword === undefined){
        res.status(500).json();
        return;
    }
    if(hashPassword === hash){
        const authToken = TokenManager.getInstance().createToken();
        res.cookie("authToken", authToken, {
            httpOnly: true,
            sameSite: "lax"
          });
        res.status(200).json({ authToken });
        return;
    }
    res.status(401).json();
});


export default router;