import express from "express";
import sensors from "./sensors";
import home from "./home";
import config from "./config";
import login from "./login";
import password from "./password"
import auth from "../controllers/auth";
import { getPublic } from "../utils/path";

const router = express.Router();

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
)
router.use(
    "/config",
    auth,
    express.static(getPublic("config"), { extensions: ["html"] }),
    config
);

router.use("/", express.static(getPublic("home")), home);

router.use("/sensors", express.static(getPublic("sensors")), sensors);

export default router;
