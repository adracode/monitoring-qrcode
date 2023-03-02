import express, { NextFunction } from "express";
import { TokenManager } from "../services/token";

module.exports = (req: express.Request, res: express.Response, next: NextFunction) => {
    const cookies = req.headers.cookie?.trim().split(';')
    for (const cookie of cookies??[]) {
        const tmp = cookie.trim().split('=');
        const cookieName = tmp[0].trim();
        const cookieValue = tmp[1].trim();
        if(cookieName==="authToken" && TokenManager.getInstance().isValid(cookieValue)){
            next();
            return;
        }
    }
    res.redirect("/authentication")
};