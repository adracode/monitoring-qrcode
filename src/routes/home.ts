import express from "express";
import { getView } from "../utils/path";

const router = express.Router();

router.get("/", async (req, res) => {
    const pageTitle = "Page d'accueil projet QR Code";
    let data: { title: string; data: any[] }[];
    data = [
        { title: "Auteurs: ", data: ["Benjamin Le Cesne", "Antoine Lefebvre"] },
        { title: "Usage", data: [`${req.hostname}/sensors/`] },
        { title: "Support", data: ["support-qrcode@isima.fr"] }
    ];
    res.status(200).render(getView('home'), { home: pageTitle, data })
});

export default router;