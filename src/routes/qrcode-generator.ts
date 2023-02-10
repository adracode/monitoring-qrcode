import express from "express"
import parser from "body-parser"
import {ConfigurationManager, SensorManager} from "../services/data-management";

const router = express.Router();

router.post("/sensors", async (req, res) => {
    res.status(200).json({sensors: await SensorManager.getInstance().getSensorsId()});
});

router.post("/generate", parser.json(), async (req, res) => {
    const sensor = await SensorManager.getInstance().getSensor(req.body.sensor, {updateData: false});
    if(sensor == null){
        res.status(404);
        return;
    }
    if(sensor.getUrlId() == null){
        ConfigurationManager.getInstance().generateUrlId(sensor);
    }
    res.status(200).send({qrcodeText: `/sensors/${sensor.getUrlId()}`});
});

export default router;