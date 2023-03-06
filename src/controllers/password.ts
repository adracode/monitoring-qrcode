import express, { NextFunction } from "express";
import { TokenManager } from "../services/token";

const { changePasswordFromWeb } = require("../services/password");

async function changePassword(req: express.Request, res: express.Response, next: NextFunction) {
    const newPassword = req.body?.password;
    const confirmPassword = req.body?.confirmPassword;
    /* Appliquer politique de sécurité */
    if (newPassword !== confirmPassword) {
        res.status(400).json({ message: "Les mots de passes ne sont pas identiques." })
        return;
    }
    if (changePasswordFromWeb(newPassword)) {
        TokenManager.getInstance().deleteAllTokens();
        res.clearCookie("authToken", {
          httpOnly: true,
          sameSite: "lax"
        });
        res.sendStatus(200);
        return;
    }
    res.status(500).json({ message: "Erreur durant la modification du mot de passe" });
};

export default changePassword;
