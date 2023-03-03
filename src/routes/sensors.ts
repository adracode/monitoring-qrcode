import express from "express"

const router = express.Router();
const sensors = require("../controllers/sensors")

router.get("/:sensor?", sensors);

export default router;