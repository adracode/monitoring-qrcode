import express from "express";
import { ConfigurationManager, SensorManager, } from "../services/data-management";
import { getView } from "../utils/path";
import { create, toString } from "qrcode";
import { getAuthCookie } from "../utils/cookie";
import { TokenManager } from "../services/token";
import { Sensor } from "../services/sensor";
import fs from "fs";

type NewSensorConfig = {
    sensorId: string;
    typeId?: string;
    display?: boolean;
    label?: string | null;
}

type NewTypeConfig = {
    typeId: string;
    label?: string;
}

/**
 * Page de configuration des capteurs.
 * @param req
 * @param res
 */
async function configPage(req: express.Request, res: express.Response) {
    const sensors = SensorManager.getInstance();
    const configurations = ConfigurationManager.getInstance();
    const config: { [p: string]: { dataType: string; isDisplayed: boolean }[] } = await sensors.getSensorsConfig();
    res.status(200).render(getView("config"), {
        sensors: await Promise.all((await sensors.getSensors({ updateData: false }))
            .map(async (sensor) => ({
                name: sensor.getId(),
                label: sensor.getRawTitle(),
                types: config[sensor.getId()],
            }))
        ),
        labels: await configurations.getLabelledDataTypes(
            await sensors.getAllDataTypes(),
            true
        ),
        settings: Sensor.getPublicSettings()
    });
}

/**
 * Envoyer les QRCodes sous forme de SVG.
 * @param req
 * @param res
 */
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

/**
 * Changer la configuration d'un capteur.
 * @param req
 * @param res
 */
async function setConfiguration(req: express.Request, res: express.Response) {
    const data: NewSensorConfig = req.body;
    await ConfigurationManager.getInstance().setConfiguration({
        sensorId: data.sensorId,
        types:
            data.display != null && data.typeId != null
                ? [{ display: data.display, id: data.typeId }]
                : undefined,
        label: data.label,
    });
    res.status(200).send();
}

/**
 * Changer le label d'un type de données.
 * @param req
 * @param res
 */
async function setTypeLabel(req: express.Request, res: express.Response) {
    const data: NewTypeConfig = req.body;
    await ConfigurationManager.getInstance().setLabelTypes([{
        id: data.typeId,
        label: data.label ?? null,
    },
    ]);
    res.status(200).send();
}

/**
 * Envoyer tous les capteurs sous forme d'ID.
 * @param req
 * @param res
 */
async function getAllSensors(req: express.Request, res: express.Response) {
    res.status(200)
        .json({ sensors: await SensorManager.getInstance().getSensorsId() });
}

/**
 * Générer un QRCode pour un capteur et le mettre à disposition du public.
 * @param req
 * @param res
 */
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

/**
 * Révoquer un QRCode, il ne sera plus utilisable.
 * @param req
 * @param res
 */
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

async function setSetting(req: express.Request, res: express.Response){
    const id = req.body.id;
    const value = req.body.value;
    if(id == null || value == null || Sensor.getSetting(id) == null || !Sensor.isSettingPublic(id)){
        return res.status(403).json({message: "Valeur invalide"});
    }
    const newValue = +value;
    if(isNaN(newValue) || newValue <= 0){
        return res.status(403).send({message: "Valeur invalide"});
    }
    Sensor.setSetting(id, value);
    let jsonString = JSON.parse(fs.readFileSync("config.json", "utf-8")) as any;
    jsonString[id] = typeof jsonString[id] !== "object" ? newValue : { ...jsonString[id], value: newValue };
    await fs.promises.writeFile("config.json", JSON.stringify(jsonString, null, 4));
    res.status(200).send({ message: "", value: newValue });
}

/**
 * Se déconnecter.
 * @param req
 * @param res
 */
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
    setSetting,
    disconnect
}