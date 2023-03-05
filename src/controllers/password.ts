import express, { NextFunction } from "express";
import { TokenManager } from "../services/token";

const {changePasswordFromWeb} = require("../services/password");

async function changePassword(req: express.Request, res: express.Response, next: NextFunction) {
    // const newPassword = req.body?.password;
    const newPassword = "admin";
    /* Appliquer politique de sécurité */
    if(changePasswordFromWeb(newPassword)){
        TokenManager.getInstance().deleteAllTokens();
        res.status(200).send();
        return;
    }
    res.status(404).send("Erreur durant la modification du mot de passe");
};

export default changePassword
