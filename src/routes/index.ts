import express from "express";
import sensors from "./sensors";
import config from "./config";
import login from "./login";
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
    "/config",
    auth,
    express.static(getPublic("config"), { extensions: ["html"] }),
    config
);

router.use("/sensors", express.static(getPublic("sensors")), sensors);

router.use("/favicon.ico", (req, res) => {
    res.status(200).send(favicon);
});

router.use("/", express.static(getPublic("home")));

router.get("*", (req, res) => res.redirect("/"));

export default router;
