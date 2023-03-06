import express from 'express';
import { SensorManager } from '../services/data-management';
import { format } from '../utils/string';
import { getView } from '../utils/path';
import { SensorsData } from '../services/sensor';

async function showData(req: express.Request, res: express.Response) {
    const sensorId: string = req.params.sensor;
    const sensor = await SensorManager.getInstance().getSensorFromURL(sensorId)

    function sendData(title: string, data: { title: string; data: any }[]) {
        res.status(200).render(getView('data'), { sensor: title, data });
    }

    function sendError(message: string, title?: string, status: number = 404) {
        res.status(status).render(getView('data'), {
            sensor: title,
            data: [{ title: 'Erreur', data: message }]
        });
    }

    console.log(sensor);
    if(sensor == null) {
        sendError('Capteur indisponible', undefined, 400);
        return;
    }
    const sensorsData: SensorsData = sensor.get();
    if(sensorsData.length == 0) {
        sendError('Données indisponibles', sensor.getTitle());
        return;
    }

    sendData(sensor.getTitle(), sensorsData.map(data => {
            let formatted = format(data.type, data.value);
            if(formatted === data.type) {
                formatted = `${data.type}: ${data.value}`;
            }
            const titleAndData = formatted.split(':');
            return {
                title: titleAndData[0],
                data: data.value == null ? 'Indisponible' : titleAndData[1]
            };
        })
    );
}

export default showData;
