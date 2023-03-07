import express from "express";
import sensors from "./sensors";
import config from "./config";
import login from "./login";
import password from "./password"
import auth from "../controllers/auth";
import { getPublic, getView } from "../utils/path";
import fs from "fs";

const router = express.Router();
const favicon = fs.readFileSync('favicon.png');

router.use(
    "/login",
    express.static(getPublic("login"), { extensions: ["html"] }),
    login
);

router.use(
    "/password",
    auth,
    express.static(getPublic("password"), { extensions: ["html"] }),
    password
);

router.use(
    "/config",
    auth,
    express.static(getPublic("config"), { extensions: ["html"] }),
    config
);

router.use("/sensors", express.static(getPublic("sensors")), sensors);

router.use("/favicon.ico", (req, res) => {
    res.status(200).send(favicon);
});

router.use(express.static(getPublic("home")), async (req, res) => {
    const pageTitle = "Page d'accueil projet QR Code";
    let data: { title: string; data: any[] }[];
    data = [{
        title: "Utilisation",
        data: ["L'objectif de ce site est de mettre à disposition au public les données des capteurs présents dans les différents bâtiments, à travers des QRCodes."]
    }, {
        title: "Auteurs: ", data: ["Benjamin LE CESNE", "Antoine LEFEBVRE"] },
    ];
    res.status(404).render(getView('home'), { home: pageTitle, data })
});

export default router;
