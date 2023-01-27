import express from "express"
import {SensorManager} from "../services/data-management";

const router = express.Router();

router.get("/genids", async (req, res) => {
    let sensorManager = SensorManager.getInstance();
    const sensors = await sensorManager.getAllSensorsId();
    let ids = await Promise.all(sensors.map(async id => (await sensorManager.getSensor(id, {update: false}))!.getUrlId()));
    res.status(200).send(ids);
});

export default router;