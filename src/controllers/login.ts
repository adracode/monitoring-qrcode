import express, { NextFunction } from "express";
import crypto from "crypto";
import { TokenManager } from "../services/token";
import { Sensor } from "../services/sensor";

async function logIn(req: express.Request, res: express.Response, next: NextFunction) {
    const hash = crypto.createHash('sha256').update(req.body?.password).digest('hex');
    const hashPassword = Sensor.getSetting<string>("adminPassword")?.toLowerCase();
    if (hashPassword === undefined) {
        res.status(500).json({message: "Aucun mot de passe connu.\nContactez votre administrateur."});
        return;
    }
    if (hashPassword === hash) {
        const authToken = TokenManager.getInstance().createToken();
        res.cookie("authToken", authToken, {
            httpOnly: true,
            sameSite: "lax"
        });
        res.sendStatus(200);
        return;
    }
    res.set('Content-Type', 'text/html')
    res.status(401).json({message: "Mot de passe incorrect."});
};

export default logIn
