import express, { NextFunction } from 'express';
import { SensorManager } from '../services/data-management';
import { format } from '../utils/string';
import { getView } from '../utils/path';
import { SensorsData } from '../services/sensor';

module.exports = async (req: express.Request, res: express.Response, next: NextFunction) => {
  const sensor: string = req.params.sensor;
  SensorManager.getInstance()
    .getSensorFromURL(sensor)
    .then(async sensor => {
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
      if (sensor == null) {
        sendError('Capteur indisponible', undefined, 400);
        return;
      }
      const sensorsData: SensorsData = sensor.get();
      if (sensorsData.length == 0) {
        sendError('Données indisponibles', sensor.getTitle());
        return;
      }

      sendData(sensor.getTitle(), sensorsData.map(data => {
        let formatted = format(data.type, data.value);
        if (formatted === data.type) {
          formatted = `${data.type}: ${data.value}`;
        }
        const titleAndData = formatted.split(':');
        return {
          title: titleAndData[0],
          data: data.value == null ? 'Indisponible' : titleAndData[1]
        };
      })
      );
    });
};
