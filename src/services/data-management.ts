import {InfluxDB} from "influx";
import sqlite, {open} from "sqlite"
import wrapped from "sqlite3"
import {ConfigurationSensor, Sensor, SensorsData} from "./sensor"
import {getSQLFile} from "../utils/path"
import * as fs from "fs";

type SensorName = { name: string };
type RawData = { [type: string]: string | number }

/**
 * Indique si l'on veut les dernières données de la base de données
 */
type GetSensorOptions = {
    updateConfig?: boolean,
    updateData?: boolean,
    forceUpdateData?: boolean
} & ({
    updateData: true,
    forceUpdateData: true
} | {
    updateData: true,
    forceUpdateData: false
} | {
    updateData: false,
    forceUpdateData?: false
})

export class SensorManager {

    private static instance: SensorManager;

    private constructor() {
    }

    public static getInstance(): SensorManager {
        if (SensorManager.instance === undefined) {
            throw new Error("Object not initialized, use SensorManager.init() to create.")
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

    public static async init(){
        this.instance = new SensorManager();
    }

    public async init(){
        for (let sensorId of (await ConfigurationManager.getInstance().getUrlIds())) {
            this.urlIds.set(sensorId.urlId, sensorId.id);
        }
    }

    /**
     * Renvoie l'ID du capteur utilisé dans l'URL pour afficher ses données.
     * Si le capteur n'existe pas, renvoie null.
     * Cet ID est un nombre généré aléatoirement en base64 (avec '-' et '_')
     * @param sensorUrlId L'ID ou le capteur dont on veut l'ID d'URL.
     */
    public async getSensorFromURL(sensorUrlId: string): Promise<Sensor | null> {
        let sensorId = this.urlIds.get(sensorUrlId);
        return sensorId != null ? this.getSensor(sensorId) : null;
    }

    /**
     * Renvoie le capteur correspondant à un ID donné.
     * Le capteur est mis à jour avec les dernières données si besoin.
     * Si le capteur n'existe pas et que l'on a explicitement indiqué que l'on ne veut pas de mise à jour, alors la
     * méthode peut renvoyer un capteur inexistant.
     * @param id ID du capteur
     * @param options Option de récupération du capteur
     */
    public async getSensor(id: string, options?: GetSensorOptions): Promise<Sensor | null> {
        id = SensorManager.sanitize(id);
        let sensor: Sensor = this.sensors.get(id) ?? new Sensor(id);
        if (options?.forceUpdateData || ((options?.updateData ?? true) && sensor.needUpdate())) {
            sensor.setData(await this.getDatabaseSensorData(id));
            if (sensor.isEmpty()) {
                return null;
            }
            if (!this.sensors.has(id)) {
                this.sensors.set(id, sensor);
            }
        }
        if((options?.updateConfig ?? true) && !sensor.hasConfig()){
            sensor.setConfiguration((await ConfigurationManager.getInstance().getConfiguration(sensor))!)
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

export class ConfigurationManager {
    private static instance: ConfigurationManager;

    private constructor(database: sqlite.Database) {
        this.source = database;
    }

    public static getInstance(): ConfigurationManager {
        if (ConfigurationManager.instance === undefined) {
            throw new Error("Object not initialized, use ConfigurationManager.init() to create.")
        }
        return this.instance;
    }

    /**
     * Ouvre la base de données de configuration et créer les tables si nécessaire.
     * @public
     */
    public static async init() {
        if (this.instance != null) {
            return this.getInstance();
        }
        let database = await open({
            filename: process.env.CONFIG_DATABASE as string,
            driver: wrapped.Database
        });
        await database.exec(ConfigurationManager.getSQLiteFile("create-config.sql"));
        this.instance = new ConfigurationManager(database);
    }

    /**
     * Synchronise la base de données de configuration avec la base de données des capteurs.
     * Les capteurs qui ne sont plus dans la base de données des capteurs ne sont pas supprimées de la configuration.
     */
    public async init(){
        let currentSensors = await SensorManager.getInstance().getAllSensorsId();
        let configuredSensors = (await this.source.all<{ sensor_id: string }[]>(
            `SELECT sensor_id FROM "sensors"`)).map(sensor => sensor.sensor_id);
        let insert = await this.source.prepare(
            `INSERT INTO "sensors" ("sensor_id", "label") values (?, ?)`);
        for (const newSensor of currentSensors.filter(sensor => !configuredSensors.includes(sensor))) {
            await insert.run(newSensor, newSensor);
        }
        await insert.finalize();
    }

    private readonly source: sqlite.Database;

    private async setConfiguration(sensors: string[]) {
        let manager = SensorManager.getInstance();
        const insert = await this.source.prepare("UPDATE sensors SET url_id = ? WHERE sensor_id = ?");
        for (const sensor of sensors) {
            let urlId = (await manager.getSensor(sensor, {updateData: false, updateConfig: false}))?.getUrlId();
            if(urlId != null){
                await insert.run(urlId, sensor);
            }
        }
        await insert.finalize();
    }

    public async getUrlIds(): Promise<{id: string, urlId: string}[]> {
        let newVar = await this.source.all<{ sensor_id: string, url_id: string }[]>(
            `SELECT sensor_id, url_id FROM "sensors"`
        ) ?? [];
        return newVar.map(query => ({id: query.sensor_id, urlId: query.url_id}));
    }

    public async getConfiguration(sensorId: string | Sensor): Promise<ConfigurationSensor | null> {
        const sensor = sensorId instanceof Sensor ? sensorId.getId() : sensorId;
        const labeledSensor = await this.source.get<{ sensor_id: string, label: string, url_id: string }>(
            `SELECT sensor_id, label, url_id FROM "sensors" WHERE sensor_id = ?`, sensor
        );
        if (labeledSensor == undefined) {
            return null;
        }
        const types = await this.source.all<{ type_id: string, label: string }[]>(
            `SELECT types_by_sensor.type_id, label FROM "types_by_sensor" LEFT JOIN "types" ON types_by_sensor.type_id = types.type_id WHERE sensor_id = ?`, sensor
        );
        return {
            label: labeledSensor.label ?? labeledSensor.sensor_id,
            urlId: labeledSensor.url_id,
            type: types.reduce((acc: { [type: string]: string }, curr: { type_id: string, label: string }) => {
                acc[curr.type_id] = curr.label ?? curr.type_id;
                return acc;
            }, {})
        }
    }

    private static getSQLiteFile(path: string): string {
        return fs.readFileSync(getSQLFile(path)).toString()
    }

    public close() {
        this.source?.close();
    }

}