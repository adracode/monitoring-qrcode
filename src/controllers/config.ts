import express, { NextFunction } from "express";
import {
  ConfigurationManager,
  SensorManager,
} from "../services/data-management";
import { getView } from "../utils/path";
import { create, toString } from "qrcode";
import { getAuthCookie } from "../utils/cookie";
import { TokenManager } from "../services/token";

const router = express.Router();

exports.slash = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
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
};

exports.slashGetQrCodes = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  const configurations = ConfigurationManager.getInstance();
  let sensors = await SensorManager.getInstance().getSensors({
    updateData: false,
  });
  let qrCodes: { [id: string]: { qrcode: string; link: string } } = {};
  for await (let sensor of sensors) {
    const urlId = sensor.getUrlId();
    if (urlId != null) {
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
};

exports.slashSet = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  const data: {
    sensorId: string;
    typeId?: string;
    set?: boolean;
    label?: string | null;
  } = req.body;
  await ConfigurationManager.getInstance().setConfiguration({
    sensorId: data.sensorId,
    types:
      data.set != null && data.typeId != null
        ? [{ set: data.set, id: data.typeId }]
        : undefined,
    label: data.label,
  });
  res.status(200).send();
};

exports.slashSetLabel = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  const data: {
    typeId: string;
    label?: string;
  } = req.body;
  await ConfigurationManager.getInstance().setLabelTypes([
    {
      id: data.typeId,
      label: data.label ?? null,
    },
  ]);
  res.status(200).send();
};

exports.slashSensors = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  res
    .status(200)
    .json({ sensors: await SensorManager.getInstance().getSensorsId() });
};

exports.slashGenerate = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  const sensor = await SensorManager.getInstance().getSensor(req.body.sensor, {
    updateData: false,
  });
  if (sensor == null) {
    res.status(404);
    return;
  }
  if (sensor.getUrlId() != null) {
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
};

exports.slashRevoke = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  const sensor = await SensorManager.getInstance().getSensor(req.body.sensor, {
    updateData: false,
  });
  if (sensor == null) {
    res.status(404);
    return;
  }
  if (sensor.getUrlId() == null) {
    res.status(200);
    return;
  }
  ConfigurationManager.getInstance().revokeUrlId(sensor);
  res.status(200).send();
};


exports.slashDeconnect = async (
  req: express.Request,
  res: express.Response,
  next: NextFunction
) => {
  const cookie = getAuthCookie(req.headers.cookie);
  if(cookie.hasAuthCookie){
    TokenManager.getInstance().deleteToken(cookie.authCookie);
  }
  res.cookie("authToken", "", {
      httpOnly: true,
      sameSite: "lax"
    });
  res.redirect("/login");
};