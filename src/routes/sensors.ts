import express from "express"
import {DataManager} from "../services/data-manager";

const router = express.Router();


router.post("/:sensor", async (req, res) => {
    let sensor: string = req.params.sensor;
    if (sensor === "all") {
        DataManager.getInstance().getAllSensorsId().then(data => {
            res.status(200).json(data)
            console.log(data)
        });
    } else {
        DataManager.getInstance().getSensor(sensor).then(sensor => {
            res.status(200).json(sensor.get("temp", "co2", "humid", "light"))
            console.log(sensor)
        });
    }
});

export default router;