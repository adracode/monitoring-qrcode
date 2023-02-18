import express from "express"
import parser from "body-parser"
import {ConfigurationManager, SensorManager} from "../services/data-management";

const router = express.Router();

router.post("/set-config", parser.json(), async (req, res) => {
    await ConfigurationManager.getInstance().setLabelTypes(req.body)
    res.status(200).send();
});

export default router;