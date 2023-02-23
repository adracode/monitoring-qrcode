import express from "express"
import parser from "body-parser"
import {ConfigurationManager, SensorManager} from "../services/data-management";
import {getView} from "../utils/path";
import {create, toString} from "qrcode";

const router = express.Router();

router.get("/config", async (req, res) => {
    const sensors = SensorManager.getInstance();
    const configurations = ConfigurationManager.getInstance();
    const config: { [p: string]: { dataType: string; isDisplayed: boolean }[] } = await sensors.getSensorsConfig();
    res.status(200).render(getView("config"),
        {
            sensors: await Promise.all((await sensors.getSensors({updateData: false}))
                .map(async sensor => ({
                    name: sensor.getId(),
                    label: sensor.getRawTitle(),
                    types: config[sensor.getId()]
                }))),
            labels: await configurations.getLabelledDataTypes(await sensors.getAllDataTypes(), true)
        })
});

router.get("/config/get-qrcodes", async (req, res) => {
    const configurations = ConfigurationManager.getInstance();
    let sensors = (await SensorManager.getInstance().getSensors({updateData: false}));
    let qrCodes: { [id: string]: { qrcode: string, link: string } } = {};
    for await (let sensor of sensors) {
        const urlId = sensor.getUrlId();
        if (urlId != null) {
            qrCodes[sensor.getId()] = {
                qrcode:
                    `data:image/svg+xml;base64,${Buffer.from(await toString(create(
                        `/sensors/${urlId}`
                    ).segments, {type: "svg", margin: 2})).toString("base64")}`,
                link: `/sensors/${urlId!}`
            }
        }
    }
    res.status(200).json(qrCodes);
});

router.post("/config/set", parser.json(), async (req, res) => {
    const data: {
        sensorId: string,
        typeId?: string,
        set?: boolean,
        label?: string | null
    } = req.body
    await ConfigurationManager.getInstance().setConfiguration({
        sensorId: data.sensorId,
        types: data.set != null && data.typeId != null ? [{set: data.set, id: data.typeId}] : undefined,
        label: data.label
    });
    res.status(200).send();
});

router.post("/config/set-label", parser.json(), async (req, res) => {
    const data: {
        typeId: string,
        label?: string
    } = req.body;
    await ConfigurationManager.getInstance().setLabelTypes([{
        id: data.typeId,
        label: data.label ?? null
    }]);
    res.status(200).send();
});

router.post("/sensors", async (req, res) => {
    res.status(200).json({sensors: await SensorManager.getInstance().getSensorsId()});
});

router.post("/config/generate", parser.json(), async (req, res) => {
    const sensor = await SensorManager.getInstance().getSensor(req.body.sensor, {updateData: false});
    if (sensor == null) {
        res.status(404);
        return;
    }
    if(sensor.getUrlId() != null){
        res.status(200).json({});
        return;
    }
    const urlId = ConfigurationManager.getInstance().generateUrlId(sensor);
    res.status(200).send({
        qrcode:
            `data:image/svg+xml;base64,${Buffer.from(await toString(create(
                `/sensors/${urlId}`
            ).segments, {type: "svg"})).toString("base64")}`,
        link: `/sensors/${urlId!}`
    });
});

router.delete("/config/revoke", parser.json(), async (req, res) => {
    const sensor = await SensorManager.getInstance().getSensor(req.body.sensor, {updateData: false});
    if (sensor == null) {
        res.status(404);
        return;
    }
    if(sensor.getUrlId() == null){
        res.status(200);
        return;
    }
    ConfigurationManager.getInstance().revokeUrlId(sensor);
    res.status(200).send();
})

export default router;