import express from "express"
import {SensorManager} from "../services/data-management";

const router = express.Router();


router.post("/:sensor", async (req, res) => {
    let sensor: string = req.params.sensor;
    if (sensor === "all") {
        SensorManager.getInstance().getAllSensorsId().then(data => {
            res.status(200).json(data)
            console.log(data)
        });
    } else {
        SensorManager.getInstance().getSensor(sensor).then(async sensor => {
            console.log(sensor)
            if (sensor == null) {
                res.status(404);
                return;
            }
            const sensorsData = sensor.get();
            res.status(200).json(sensorsData.map(data => ({
                type: data.type,
                value: data.value
            })))
        });
    }
});

export default router;