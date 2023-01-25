import express from "express"
import {ConfigurationManager, ConfigurationSensor, SensorManager} from "../services/data-management";

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
            const config: ConfigurationSensor | null = await ConfigurationManager.getInstance().getConfiguration(sensor);
            if (config == null) {
                res.status(404);
                return;
            }
            const types = config[Object.keys(config)[0]].type;
            const sensorsData = sensor.get(Object.keys(types));
            res.status(200).json(sensorsData.map(data => ({
                type: types[data.type],
                value: data.value
            })))
        });
    }
});

export default router;