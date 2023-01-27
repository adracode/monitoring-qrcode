import express from "express"
import {SensorManager} from "../services/data-management";
import {format} from "../utils/string";

const router = express.Router();


router.post("/:sensor", async (req, res) => {
    let sensor: string = req.params.sensor;
    if (sensor === "all") {
        SensorManager.getInstance().getAllSensorsId().then(data => {
            res.status(200).json(data)
            console.log(data)
        });
    } else {
        SensorManager.getInstance().getSensorFromURL(sensor).then(async sensor => {
            console.log(sensor)
            if (sensor == null) {
                res.status(404).json({message: "Capteur indisponible"});
                return;
            }
            const sensorsData = sensor.get();
            res.status(200).json(sensorsData.map(data => {
                const formatted = format(data.type, data.value);
                return {
                    data: formatted === data.type ?
                        `${data.type}: ${data.value}` :
                        formatted
                }
            }))
        });
    }
});

export default router;