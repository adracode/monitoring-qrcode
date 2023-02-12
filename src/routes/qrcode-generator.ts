import express from "express"
import parser from "body-parser"
import {ConfigurationManager, SensorManager} from "../services/data-management";
import {getView} from "../utils/path";
import {create, toString} from "qrcode";

const router = express.Router();

router.get("/config", async (req, res) => {
    const config: { [p: string]: { dataType: string; isDisplayed: boolean }[] } = await SensorManager.getInstance().getSensorsConfig();
    res.status(200).render(getView("config"),
        {
            sensors: await Promise.all((await SensorManager.getInstance().getSensors({updateData: false}))
                .map(async sensor => {
                    const url = `/sensors/${ConfigurationManager.getInstance().generateUrlId(sensor)!}`;
                    return {
                        name: sensor.getId(),
                        label: sensor.getRawTitle(),
                        qrcode: `data:image/svg+xml;base64,${Buffer.from(await toString(create(url).segments, {type: "svg"}))
                            .toString("base64")}`,
                        qrcodeText: url,
                        types: config[sensor.getId()]
                    }
                }))
        })
});

router.post("/config/set", parser.json(), async (req, res) => {
    const data: {
        sensorId: string,
        typeId?: string,
        set?: boolean,
        label?: string
    } = req.body
    await ConfigurationManager.getInstance().setConfiguration({
        sensorId: data.sensorId,
        types: data.set != null && data.typeId != null ? [{set: data.set, id: data.typeId}] : undefined,
        label: data.label
    });
    res.status(200).send();
})

router.post("/sensors", async (req, res) => {
    res.status(200).json({sensors: await SensorManager.getInstance().getSensorsId()});
});

router.post("/generate", parser.json(), async (req, res) => {
    const sensor = await SensorManager.getInstance().getSensor(req.body.sensor, {updateData: false});
    if (sensor == null) {
        res.status(404);
        return;
    }
    if (sensor.getUrlId() == null) {
        ConfigurationManager.getInstance().generateUrlId(sensor);
    }
    res.status(200).send({qrcodeText: `/sensors/${sensor.getUrlId()}`});
});

export default router;