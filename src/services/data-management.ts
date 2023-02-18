import {InfluxDB} from "influx";
import sqlite, {open} from "sqlite"
import wrapped from "sqlite3"
import {ConfigurationSensor, Sensor, SensorsData} from "./sensor"
import {getSQLFile} from "../utils/path"
import * as fs from "fs";

type SensorName = { name: string };
type RawData = { [type: string]: string | number }
type Config = { [id: string]: { label: string, fields: [{ name: string, checked: boolean }] } }
type RawResults = {
    results: {
        statement_id: number,
        series: {
            name: string,
            columns: string[],
            values: (string | number)[][]
        }[]
    }[]
};

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
    public async getSensorsId(): Promise<string[]> {
        return (await this.source.query<SensorName>(`SHOW MEASUREMENTS`)).map(sensor => sensor.name);
    }

    public static async init() {
        this.instance = new SensorManager();
    }

    public async init() {
        for (let sensorId of (await ConfigurationManager.getInstance().getUrlIds())) {
            this.setUrlId(sensorId.id, sensorId.urlId);
        }
    }

    public setUrlId(sensor: string | null, urlId: string) {
        if (sensor != null) {
            this.urlIds.set(urlId, sensor);
        } else {
            this.urlIds.delete(urlId);
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
        if ((options?.updateConfig ?? false) || !sensor.hasConfig()) {
            sensor.setConfiguration((await ConfigurationManager.getInstance().getConfiguration(sensor))!)
        }
        return sensor;
    }

    public async getSensors(options?: GetSensorOptions): Promise<Sensor[]> {
        return await Promise.all((await this.getSensorsId())
            .map(async (sensorId: string) => (await this.getSensor(sensorId, options))!))
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

    /**
     * Renvoie un dictionnaire contenant les noms des capteurs avec les types de données qu'ils affichent.
     */
    public async getSensorsConfig(): Promise<{ [sensorId: string]: { dataType: string, isDisplayed: boolean }[] }> {
        let tables = (await this.source.queryRaw(`SHOW FIELD KEYS`) as RawResults).results[0].series;
        const typesBySensor = (await ConfigurationManager.getInstance().getTypesBySensorId(tables.map(sensor => sensor.name)));
        //Conversion de la liste des tables (capteurs) en dictionnaire
        return tables.reduce((config: { [name: string]: { dataType: string, isDisplayed: boolean }[] }, table) => {
            const sensor = table.name;
            const displayedTypes = typesBySensor[sensor]
            config[sensor] = table.values.map(column => {
                const dataType = column[0] as string;
                return {
                    dataType: dataType,
                    isDisplayed: displayedTypes != null && displayedTypes.includes(dataType)
                };
            });
            return config;
        }, {});
    }

    public async getAllDataTypes(): Promise<string[]> {
        return (await this.source.query<{ fieldKey: string }>(`SHOW FIELD KEYS`))
            .reduce((acc: string[], cur) => {
                if (!acc.includes(cur.fieldKey)) {
                    acc.push(cur.fieldKey);
                }
                return acc;
            }, []);
    }

    public async updateSensors(...ids: string[]) {
        for (let sensor of ids.length == 0 ? await this.getSensorsId() : ids) {
            this.getSensor(sensor, {updateData: false, updateConfig: true}).then();
        }
    }
}

type TypeBySensor = { sensorId: string; typesId: string };

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
    public async init() {
        let currentSensors = await SensorManager.getInstance().getSensorsId();
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

    public async setConfiguration(config: {
        sensorId: string,
        types?: {
            id: string,
            set: boolean
        }[],
        label?: string | null
    }) {
        const deleteQuery = await this.source.prepare("DELETE FROM types_by_sensor WHERE sensor_id = ? AND type_id = ?");
        const insert = await this.source.prepare("INSERT INTO types_by_sensor (sensor_id, type_id) VALUES (?, ?)");
        const sensor = config.sensorId;
        if (config.label != null) {
            const update = await this.source.prepare("UPDATE sensors SET label = ? WHERE sensor_id = ?");
            await update.run(config.label, sensor);
        }
        let configuredTypes = (await this.getTypesBySensorId([sensor]))[sensor];
        for (let type of config.types ?? []) {
            let typeId = type.id;
            let set = type.set;
            if (configuredTypes.includes(typeId)) {
                if (!set) {
                    await deleteQuery.run(sensor, typeId);
                }
            } else if (set) {
                await insert.run(sensor, typeId);
            }
        }
        await SensorManager.getInstance().updateSensors(sensor);
    }

    public async setConfigurations(config: Config) {
        /*
        const update = await this.source.prepare("UPDATE sensors SET label = ? WHERE sensor_id = ?");
        const deleteQuery = await this.source.prepare("DELETE FROM types_by_sensor WHERE sensor_id = ? AND type_id = ?");
        const insert = await this.source.prepare("INSERT INTO types_by_sensor (sensor_id, type_id) VALUES (?, ?)");
        for (let sensor of Object.keys(config)) {
            await update.run(config[sensor].label, sensor);
            let configuredTypes = await this.getTypesBySensorId(sensor);
            for (let field of config[sensor].fields) {
                let fieldName = field.name;
                let fieldChecked = field.checked;
                if (configuredTypes.includes(fieldName)) {
                    if (!fieldChecked) {
                        await deleteQuery.run(sensor, fieldName);
                    }
                } else if (fieldChecked) {
                    await insert.run(sensor, fieldName);
                }
            }
            SensorManager.getInstance().getSensor(sensor, {updateData: false, updateConfig: true});
        }*/
    }

    public generateUrlId(sensor: Sensor): string | null {
        let urlId = sensor.getUrlId();
        if (urlId == null) {
            urlId = sensor.generateUrlId();
            SensorManager.getInstance().setUrlId(sensor.getId(), urlId);
            this.source.run(`UPDATE sensors SET url_id = ? WHERE sensor_id = ?`, urlId, sensor.getId()).then();
        }
        return urlId;
    }

    public revokeUrlId(sensor: Sensor) {
        let urlId = sensor.getUrlId();
        if (urlId != null) {
            sensor.revokeUrlId();
            SensorManager.getInstance().setUrlId(null, urlId);
            this.source.run(`UPDATE sensors SET url_id = NULL WHERE sensor_id = ?`, sensor.getId()).then();
        }
    }

    public async getUrlIds(): Promise<{ id: string, urlId: string }[]> {
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

    public async getTypesBySensorId(sensorsId: string[]): Promise<{ [sensorId: string]: string[] }> {
        if (sensorsId.length == 1) {
            const sensor = sensorsId[0];
            return {
                [sensor]: (await this.source.all<{ typeId: string }[]>(
                    `SELECT type_id AS typeId FROM "types_by_sensor" WHERE sensor_id = ?`, sensor))
                    .map((sensorId: { typeId: string }) => sensorId.typeId)
            };
        } else if (sensorsId.length > 1) {
            const typesBySensor = (await this.source.all<TypeBySensor[]>(
                `SELECT sensor_id AS sensorId, group_concat(type_id) AS typesId FROM "types_by_sensor" GROUP BY sensor_id`))
                .filter((sensor: TypeBySensor) => sensorsId.includes(sensor.sensorId))
                .map((sensor: TypeBySensor) => ({...sensor, type_id: sensor.typesId.split(",")}));

            return typesBySensor.reduce((acc: { [sensorId: string]: string[] }, curr) => {
                acc[curr.sensorId] = curr.type_id;
                return acc;
            }, {})
        } else {
            return {}
        }

    }

    /**
     * Renvoie tous les types de données avec leurs labels présents dans la configuration.
     * @param ids Filtrer les types retournés, seuls les ids présents dans ce tableau sont renvoyés avec leur label.
     * @param includeArgument Inclure dans le résultat les ids passés en argument, le résultat pourra contenir des labels nuls.
     */
    public async getLabelledDataTypes(ids?: string[], includeArgument?: boolean): Promise<{ id: string, label: string | null }[]> {
        if (ids != null && ids.length == 1) {
            return (await this.source.all<{ id: string, label: string | null }[]>(
                `SELECT type_id AS id, label FROM "types" WHERE type_id = ?`, [ids[0]]));
        }
        let labeledTypes = (await this.source.all<{ id: string, label: string | null }[]>(
            `SELECT type_id AS id, label FROM "types"`));
        if (ids != null) {
            labeledTypes = labeledTypes.filter(type => ids.includes(type.id));
            if (includeArgument) {
                for (let id of ids) {
                    if (labeledTypes.find(type => type.id === id) == null) {
                        labeledTypes.push({id: id, label: null});
                    }
                }
            }
        }
        return labeledTypes;
    }

    public async setLabelTypes(types: { id: string, label: string | null }[]) {
        const update = await this.source.prepare("UPDATE types SET label = ? WHERE type_id = ?");
        const insert = await this.source.prepare("INSERT INTO types (type_id, label) VALUES (?, ?)");
        const remove = await this.source.prepare("DELETE FROM types WHERE type_id = ?");

        let configuredTypes = (await this.getLabelledDataTypes(types.map(type => type.id), false))
            .map(labelledType => labelledType.id);
        for (let field of types) {
            if (configuredTypes.includes(field.id)) {
                if (field.label == null) {
                    await remove.run(field.id);
                } else {
                    await update.run(field.label, field.id);
                }
            } else if (field.label != null) {
                await insert.run(field.id, field.label);
            }
        }
        SensorManager.getInstance().updateSensors().then();
    }

}