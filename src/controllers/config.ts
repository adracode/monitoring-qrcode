import express from "express";
import { ConfigurationManager, SensorManager, } from "../services/data-management";
import { getView } from "../utils/path";
import { create, toString } from "qrcode";
import { getAuthCookie } from "../utils/cookie";
import { TokenManager } from "../services/token";

type NewSensorConfig = {
    sensorId: string;
    typeId?: string;
    set?: boolean;
    label?: string | null;
}

type NewTypeConfig = {
    typeId: string;
    label?: string;
}

async function configPage(req: express.Request, res: express.Response) {
    const sensors = SensorManager.getInstance();
    const configurations = ConfigurationManager.getInstance();
    const config: { [p: string]: { dataType: string; isDisplayed: boolean }[] } =
        await sensors.getSensorsConfig();
    res.status(200).render(getView("config"), {
        sensors: await Promise.all(
            (
                await sensors.getSensors({ updateData: false })
            ).map(async (sensor) => ({
                name: sensor.getId(),
                label: sensor.getRawTitle(),
                types: config[sensor.getId()],
            }))
        ),
        labels: await configurations.getLabelledDataTypes(
            await sensors.getAllDataTypes(),
            true
        ),
    });
}

async function getQRCodes(req: express.Request, res: express.Response) {
    let sensors = await SensorManager.getInstance().getSensors({
        updateData: false,
    });
    let qrCodes: { [id: string]: { qrcode: string; link: string } } = {};
    for await (let sensor of sensors) {
        const urlId = sensor.getUrlId();
        if(urlId != null) {
            qrCodes[sensor.getId()] = {
                qrcode: `data:image/svg+xml;base64,${Buffer.from(
                    await toString(create(`/sensors/${urlId}`).segments, {
                        type: "svg",
                        margin: 2,
                    })
                ).toString("base64")}`,
                link: `/sensors/${urlId!}`,
            };
        }
    }
    res.status(200).json(qrCodes);
}

async function setConfiguration(req: express.Request, res: express.Response) {
    const data: NewSensorConfig = req.body;
    await ConfigurationManager.getInstance().setConfiguration({
        sensorId: data.sensorId,
        types:
            data.set != null && data.typeId != null
                ? [{ set: data.set, id: data.typeId }]
                : undefined,
        label: data.label,
    });
    res.status(200).send();
}

async function setTypeLabel(req: express.Request, res: express.Response) {
    const data: NewTypeConfig = req.body;
    await ConfigurationManager.getInstance().setLabelTypes([{
        id: data.typeId,
        label: data.label ?? null,
    },
    ]);
    res.status(200).send();
}

async function getAllSensors(req: express.Request, res: express.Response) {
    res.status(200)
        .json({ sensors: await SensorManager.getInstance().getSensorsId() });
}

async function generateQRCode(req: express.Request, res: express.Response) {
    const sensor = await SensorManager.getInstance().getSensor(req.body.sensor, {
        updateData: false,
    });
    if(sensor == null) {
        res.status(404);
        return;
    }
    if(sensor.getUrlId() != null) {
        res.status(200).json({});
        return;
    }
    const urlId = ConfigurationManager.getInstance().generateUrlId(sensor);
    res.status(200).send({
        qrcode: `data:image/svg+xml;base64,${Buffer.from(
            await toString(create(`/sensors/${urlId}`).segments, { type: "svg" })
        ).toString("base64")}`,
        link: `/sensors/${urlId!}`,
    });
}

async function revokeQRCode(req: express.Request, res: express.Response) {
    const sensor = await SensorManager.getInstance().getSensor(req.body.sensor, {
        updateData: false,
    });
    if(sensor == null) {
        res.status(404);
        return;
    }
    if(sensor.getUrlId() == null) {
        res.status(200);
        return;
    }
    ConfigurationManager.getInstance().revokeUrlId(sensor);
    res.status(200).send();
}

async function disconnect(req: express.Request, res: express.Response) {
    const cookie = getAuthCookie(req.headers.cookie);
    if(cookie.hasAuthCookie) {
        TokenManager.getInstance().deleteToken(cookie.authCookie);
    }
    res.clearCookie("authToken", {
        httpOnly: true,
        sameSite: "lax"
    });
    res.status(302).json({ url: "/login" })
}

module.exports = {
    configPage,
    getQRCodes,
    setConfiguration,
    setTypeLabel,
    getAllSensors,
    generateQRCode,
    revokeQRCode,
    disconnect
}