import express from "express"
import {DataManager} from "../services/data-manager";
import getPathPage from "../utils/path";

const router = express.Router();

//router.use("/", express.static(getPathPage("sensors")))

router.get("/:sensor", (req, res) => {
    let sensor: string = req.params.sensor;
    if (sensor === "all") {
        DataManager.getInstance().getAllSensorsId().then(data => {
            res.status(200).send(data)
            console.log(data)
        });
    } else {
        DataManager.getInstance().getSensor(sensor).then(sensor => {
            res.status(200).send(sensor.getAll())
            console.log(sensor)
        });
    }
});

export default router;