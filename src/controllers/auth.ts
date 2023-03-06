import express, { NextFunction } from "express";
import { getAuthCookie } from "../utils/cookie";

/**
 * Vérifier que l'utilisateur est authentifié.
 * @param req
 * @param res
 * @param next
 */
function verifyAuthentication(req: express.Request, res: express.Response, next: NextFunction) {
    if(getAuthCookie(req.headers.cookie).hasAuthCookie) {
        next();
        return;
    }
    res.redirect("/login")
}

export default verifyAuthentication;