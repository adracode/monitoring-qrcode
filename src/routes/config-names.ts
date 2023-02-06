import express from "express"
import parser from "body-parser"
import {ConfigurationManager, SensorManager} from "../services/data-management";

const router = express.Router();

router.get("/get-config", async (req, res) => {
    res.status(200).json({fields: await ConfigurationManager.getInstance().getFields()});
});

router.post("/set-config", parser.json(), async (req, res) => {
    await ConfigurationManager.getInstance().setNames(req.body)
    res.status(200).send();
});

export default router;