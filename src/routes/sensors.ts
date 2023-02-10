import express from "express"
import {SensorManager} from "../services/data-management";
import {format} from "../utils/string";
import {getView} from "../utils/path";
import {SensorsData} from "../services/sensor";

const router = express.Router();

router.get("/:sensor", async (req, res) => {
    let sensor: string = req.params.sensor;
    SensorManager.getInstance().getSensorFromURL(sensor).then(async sensor => {
        function sendData(title: string, data: { title: string, data: number | string }[] ) {
            res.status(200).render(getView("data"), {sensor: title, data: data});
        }

        function sendError(message: string, title?: string) {
            res.status(404).render(getView("data"), {sensor: title, data: [{title: "Erreur", data: message}]});
        }

        console.log(sensor)
        if (sensor == null) {
            sendError("Capteur indisponible");
            return;
        }
        const sensorsData: SensorsData = sensor.get();
        if (sensorsData.length == 0) {
            sendError("Données indisponibles", sensor.getTitle());
            return;
        }

        sendData(sensor.getTitle(), sensorsData.map(data => {
            let formatted = format(data.type, data.value);
            if(formatted === data.type){
                formatted = `${data.type}: ${data.value}`;
            }
            const titleAndData = formatted.split(":");
            return {title: titleAndData[0], data: titleAndData[1]}
        }));
    });
});

export default router;