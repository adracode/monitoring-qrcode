import express from "express";
import sensors from "./sensors";
import config from "./config";
import login from "./login";
//import dev from "./dev";
import { getPublic } from "../utils/path";

const router = express.Router();
const auth = require("../controllers/auth");

const sensorsStatic = express.static(getPublic("sensors"));


router.use(
  "/login",
  express.static(getPublic("login"), { extensions: ["html"] }),
  login
);
router.use(
  "/config",
  express.static(getPublic("config"), { extensions: ["html"] }),
  auth,
  config
);
router.use("/", sensorsStatic, sensors);
router.use("/sensors", sensorsStatic, sensors);

//router.use("/dev", express.static(getPublic("dev")))
//router.use("/dev", dev);

export default router;
