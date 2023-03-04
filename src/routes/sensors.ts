import express from "express";
import showData from "../controllers/sensors";

const router = express.Router();

router.get("/:sensor?", showData);

export default router;