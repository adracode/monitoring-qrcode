import express from "express"
import parser from "body-parser"
import {SensorManager} from "../services/data-management";

const router = express.Router();

router.post("/sensors", async (req, res) => {
    res.status(200).json({sensors: await SensorManager.getInstance().getAllSensorsId()});
});

router.post("/generate", parser.json(), async (req, res) => {
    const sensor = await SensorManager.getInstance().getSensor(req.body.sensor, {updateData: false});
    if(sensor?.getUrlId() == null){
        res.status(404);
        return;
    }
    res.status(200).send({qrcodeText: process.env.SENSOR_PATH! + sensor.getUrlId()});
});

export default router;