import express from "express";
import { getView } from "../utils/path";

const router = express.Router();

router.get("/", async (req, res) => {
    const pageTitle = "Page d'accueil projet QR Code";
    let data: { title: string; data: any[] }[];
    data = [{
        title: "Utilisation",
        data: ["L'objectif de ce site est de mettre à disposition au public les données des capteurs présents dans les différents bâtiments, à travers des QRCodes."]
    }, {
        title: "Auteurs: ", data: ["Benjamin Le Cesne", "Antoine Lefebvre"] },
    ];
    res.status(404).render(getView('home'), { home: pageTitle, data })
});

export default router;