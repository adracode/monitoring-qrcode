import express from "express"
import {SensorManager} from "../services/data-management";
import {format} from "../utils/string";

const router = express.Router();

router.post("/:sensor", async (req, res) => {
    let sensor: string = req.params.sensor;
    console.log(sensor)
    SensorManager.getInstance().getSensorFromURL(sensor).then(async sensor => {
        function sendData(title: string, dataArray: string[]) {
            res.status(200).json({sensorTitle: title, data: dataArray});
        }
        function sendError(message: string, title?: string) {
            res.status(404).json({sensorTitle: title, data: [`Erreur: ${message}`]});
        }
        console.log(sensor)
        if (sensor == null) {
            sendError("Capteur indisponible");
            return;
        }
        const sensorsData = sensor.get();
        if(sensorsData.length == 0){
            sendError("Données indisponibles", sensor.getTitle());
            return;
        }
        sendData(sensor.getTitle(), sensorsData.map(data => {
            const formatted = format(data.type, data.value);
            return formatted === data.type ?
                `${data.type}: ${data.value}` :
                formatted;
        }));
    });
});

export default router;