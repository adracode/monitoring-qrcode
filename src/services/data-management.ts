import {InfluxDB} from "influx";
import sqlite, {open} from "sqlite"
import wrapped from "sqlite3"
import {Sensor, SensorsData} from "./sensor"
import {getSQLFile} from "../utils/path"
import * as fs from "fs";
import * as url from "url";

type SensorName = { name: string };
type RawData = { [type: string]: string | number }
type UpdateSensor = {
    update: true,
    forceUpdate: true
} | {
    update: true,
    forceUpdate: false
} | {
    update: false,
    forceUpdate?: false
}

export class SensorManager {

    private static instance: SensorManager;

    private constructor() {
    }

    public static getInstance(): SensorManager {
        if (SensorManager.instance === undefined) {
            SensorManager.instance = new SensorManager();
        }
        return SensorManager.instance;
    }

    private readonly source = new InfluxDB({
        protocol: "https",
        host: process.env.INFLUXDB_HOST,
        port: 443,
        path: process.env.INFLUXDB_PATH,
        database: process.env.INFLUXDB_DATABASE,
        username: process.env.INFLUXDB_USERNAME,
        password: process.env.INFLUXDB_PASSWORD
    });

    private sensors: Map<string, Sensor> = new Map<string, Sensor>();
    private urlIds: Map<string, string> = new Map<string, string>();

    /**
     * Renvoie tous les capteurs présents dans la base de données sous forme de leur ID.
     */
    public async getAllSensorsId(): Promise<string[]> {
        return (await this.source.query<SensorName>(`SHOW MEASUREMENTS`)).map(sensor => sensor.name);
    }

    /**
     * Renvoie l'ID du capteur utilisé dans l'URL pour afficher ses données.
     * Si le capteur n'existe pas, renvoie null.
     * Cet ID est un nombre généré aléatoirement en base64 (avec '-' et '_')
     * @param sensor L'ID ou le capteur dont on veut l'ID d'URL.
     */
    public async getUrlId(sensor: Sensor | string): Promise<string | null> {
        if(!(sensor instanceof Sensor)){
            const getSensor = (await this.getSensor(sensor, {update: false}))!;
            if(getSensor == null){
                return null;
            }
            sensor = getSensor;
        }
        let id = this.urlIds.get(sensor.getId());
        if(id !== undefined){
            return id;
        }
        id = sensor.generateUrlId();

        this.urlIds.set(sensor.getId(), id);
        return id;
    }

    /**
     * Renvoie le capteur correspondant à un ID donné.
     * Le capteur est mis à jour avec les dernières données si besoin.
     * Si le capteur n'existe pas et que l'on a explicitement indiqué que l'on ne veut pas de mise à jour, alors la
     * méthode peut renvoyer un capteur inexistant.
     * @param id ID du capteur
     * @param update Indique si l'on veut les dernières données de la base de données
     */
    public async getSensor(id: string, update: UpdateSensor = {
        update: true,
        forceUpdate: false
    }): Promise<Sensor | null> {
        id = SensorManager.sanitize(id);
        let sensor: Sensor = this.sensors.get(id) ?? new Sensor(id, id);
        if (update.forceUpdate || (update.update && sensor.needUpdate())) {
            sensor.set(await this.getDatabaseSensorData(id));
            if (sensor.isEmpty()) {
                return null;
            }
            if (!this.sensors.has(id)) {
                this.sensors.set(id, sensor);
            }
        }
        return sensor;
    }

    /**
     * Récupère toutes les données d'un capteur de la base de données
     * @param id L'ID du capteur
     * @private
     */
    private async getDatabaseSensorData(id: string): Promise<SensorsData> {
        return Object.entries((await this.source.query<RawData>(
            `SELECT * FROM "${SensorManager.sanitize(id)}" ORDER BY time DESC LIMIT 1`
        )).at(0) ?? {}).map(([dataType, data]) => ({
            type: dataType,
            value: data
        }));
    }

    /**
     * Assainit une séquence afin d'éviter les injections SQL, en n'autorisant que les caractères alphanumériques et les tirets / underscores.
     * Deux tirets étant un commentaire, il faut utiliser le résultat de cette méthode entre guillements dans la requête.
     * @param input La séquence à assainir.
     * @private
     */
    private static sanitize(input: string): string {
        return input.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
    }
}

export type ConfigurationSensor = {
    [id: string]: {
        label: string,
        type: {
            [type: string]: string
        }
    }
}

export class ConfigurationManager {
    private static instance: ConfigurationManager;

    private constructor() {
        this.synchronize();
    }

    public static getInstance(): ConfigurationManager {
        if (ConfigurationManager.instance === undefined) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    private source?: sqlite.Database;

    /**
     * Ouvre la base de données de configuration et créer les tables si nécessaire.
     * @private
     */
    private async init() {
        this.source = await open({
            filename: process.env.CONFIG_DATABASE as string,
            driver: wrapped.Database
        });
        await this.source.exec(ConfigurationManager.getSQLiteFile("create-config.sql"));
    }

    /**
     * Synchronise la base de données de configuration avec la base de données des capteurs.
     * Les capteurs qui ne sont plus dans la base de données des capteurs ne sont pas supprimées de la configuration.
     * @public
     */
    public async synchronize() {
        await this.ensureOpen();
        let currentSensors = await SensorManager.getInstance().getAllSensorsId();
        let configuredSensors = (await this.source!.all<{ sensor_id: string }[]>(
            `SELECT sensor_id FROM "sensors"`)).map(sensor => sensor.sensor_id);
        let insert = await this.source!.prepare(
            `INSERT INTO "sensors" ("sensor_id", "label") values (?, ?)`);
        for (const newSensor of currentSensors.filter(sensor => !configuredSensors.includes(sensor))) {
            await insert.run(newSensor, newSensor);
        }
        await insert.finalize();
    }

    private async saveUrlIds(sensors: string[]){
        await this.ensureOpen();
        let manager = SensorManager.getInstance();
        const insert = await this.source!.prepare("UPDATE sensors SET url_id = ? WHERE sensor_id = ?");
        for(const sensor of sensors){
            let urlId = await manager.getUrlId(sensor);
            await insert.run(urlId, sensor);
        }
        await insert.finalize();
    }

    public async getConfiguration(sensorId: string | Sensor): Promise<ConfigurationSensor | null> {
        await this.ensureOpen();
        const sensor = sensorId instanceof Sensor ? sensorId.getId() : sensorId;
        const labeledSensor = await this.source!.get<{ sensor_id: string, label: string }>(
            `SELECT sensor_id, label FROM "sensors" WHERE sensor_id = ?`, sensor
        );
        if (labeledSensor == undefined) {
            return null;
        }
        const types = await this.source!.all<{ type_id: string, label: string }[]>(
            `SELECT types_by_sensor.type_id, label FROM "types_by_sensor" LEFT JOIN "types" ON types_by_sensor.type_id = types.type_id WHERE sensor_id = ?`, sensor
        );
        return {
            [labeledSensor.sensor_id]: {
                label: labeledSensor.label ?? labeledSensor.sensor_id,
                type: types.reduce((acc: { [type: string]: string }, curr: { type_id: string, label: string }) => {
                    acc[curr.type_id] = curr.label ?? curr.type_id;
                    return acc;
                }, {})
            }
        }
    }

    private static getSQLiteFile(path: string): string {
        return fs.readFileSync(getSQLFile(path)).toString()
    }

    private async ensureOpen() {
        if (this.source == null) {
            await this.init();
        }
    }

    public close() {
        this.source?.close();
    }

}