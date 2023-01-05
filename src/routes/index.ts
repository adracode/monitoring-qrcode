import express from "express";
import sensors from "./sensors";

const router = express.Router();
router.use("/sensors", sensors);

export default router;