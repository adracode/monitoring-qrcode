import { InfluxDB } from "influx";
import sqlite, { open } from "sqlite"
import wrapped from "sqlite3"
import { ConfigurationSensor, Sensor, SensorsData } from "./sensor"
import { getSQLFile } from "../utils/path"
import * as fs from "fs";

/**
 * Représente le résultat de la requête pour obtenir tous les noms des capteurs d'Influx.
 */
type SensorName = { name: string };

/**
 * Représente le résultat de la requête pour ovtenir toutes les données d'un capteur d'Influx.
 */
type RawData = {
    time?: { getNanoTime: () => number },
    [type: string]: any
}

type RawResults = {
    results: {
        statement_id: number,
        series: {
            name: string,
            columns: string[],
            values: any[][]
        }[]
    }[]
};

/**
 * Indique si l'on veut les dernières données de la base de données.
 * On ne peut pas avoir en même temps forceUpdateData à true et updateData à false.
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

/**
 * Gère les données de la BDD Influx.
 * Cette classe est un singleton, pour l'initialiser, il faut appeler SensorManager.init(), puis on peut récupérer l'instance avec SensorManager.getInstance().
 */
export class SensorManager {

    private static instance: SensorManager;
    private readonly source = new InfluxDB({
        protocol: "https",
        host: process.env.INFLUXDB_HOST,
        port: 443,
        path: process.env.INFLUXDB_PATH,
        database: process.env.INFLUXDB_DATABASE,
        username: process.env.INFLUXDB_USERNAME,
        password: process.env.INFLUXDB_PASSWORD
    });

    private sensorsById: Map<string, Sensor> = new Map<string, Sensor>();
    private sensorsByUrl: Map<string, string> = new Map<string, string>();

    private constructor() {
    }

    public static getInstance(): SensorManager {
        if(SensorManager.instance === undefined) {
            throw new Error("Object not initialized, use SensorManager.init() to create.")
        }
        return SensorManager.instance;
    }

    public static async init() {
        this.instance = new SensorManager();
    }

    /**
     * Initialise l'instance en récupérant toutes les URLs des capteurs.
     */
    public async init() {
        for(let sensorId of (await ConfigurationManager.getInstance().getUrlIds())) {
            this.setUrlId(sensorId.id, sensorId.urlId);
        }
    }

    /**
     * Renvoie tous les capteurs présents dans la base de données sous forme de leur ID.
     */
    public async getSensorsId(): Promise<string[]> {
        return (await this.source.query<SensorName>(`SHOW MEASUREMENTS`)).map(sensor => sensor.name);
    }

    /**
     * Renvoie tous les capteurs de la base Influx
     * @param options Options de mise à jour
     */
    public async getSensors(options?: GetSensorOptions): Promise<Sensor[]> {
        return await Promise.all((await this.getSensorsId())
            .map(async (sensorId: string) => (await this.getSensor(sensorId, options))!))
    }

    /**
     * Renvoie l'ID du capteur à partir de son URL.
     * Si le capteur n'existe pas, renvoie null.
     * @param sensorUrl L'URL du capteur
     */
    public async getSensorByURL(sensorUrl: string): Promise<Sensor | null> {
        let sensorId = this.sensorsByUrl.get(sensorUrl);
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
        let sensor: Sensor = this.sensorsById.get(id) ?? new Sensor(id);
        if(options?.forceUpdateData || ((options?.updateData ?? true) && sensor.needUpdate())) {
            const data = await this.getDatabaseSensorData(id);
            sensor.setData(data.dateOfData, data.data);
            if(sensor.isEmpty()) {
                return null;
            }
            if(!this.sensorsById.has(id)) {
                this.sensorsById.set(id, sensor);
            }
        }
        if((options?.updateConfig ?? false) || !sensor.hasConfig()) {
            sensor.setConfiguration((await ConfigurationManager.getInstance().getConfiguration(sensor.getId())) ?? {})
        }
        return sensor;
    }

    /**
     * Renvoie un dictionnaire contenant les noms des capteurs avec tous les types de données qu'ils affichent ou non.
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

    /**
     * Renvoie tous les types de données présents dans Influx (ex: co2, temp, light...).
     */
    public async getAllDataTypes(): Promise<string[]> {
        return (await this.source.query<{ fieldKey: string }>(`SHOW FIELD KEYS`))
            .reduce((acc: string[], cur) => {
                if(!acc.includes(cur.fieldKey)) {
                    acc.push(cur.fieldKey);
                }
                return acc;
            }, []);
    }

    /**
     * Mettre à jour la configuration des capteurs.
     * @param ids Les capteurs à mettre à jour, vide pour tout selectionner
     */
    public async updateSensors(...ids: string[]) {
        for(let sensor of ids.length == 0 ? await this.getSensorsId() : ids) {
            this.getSensor(sensor, { updateData: false, updateConfig: true }).then();
        }
    }

    /**
     * Associe ou dissocie une URL avec un capteur.
     * @param sensor L'ID du capteur
     * @param urlId l'URL utilisé
     */
    public setUrlId(sensor: string | null, urlId: string) {
        if(sensor != null) {
            this.sensorsByUrl.set(urlId, sensor);
        } else {
            this.sensorsByUrl.delete(urlId);
        }
    }

    /**
     * Récupère toutes les données d'un capteur de la base de données
     * @param id L'ID du capteur
     * @private
     */
    private async getDatabaseSensorData(id: string): Promise<{ dateOfData: number, data: SensorsData }> {
        const rawData = (await this.source.query<RawData>(
            `SELECT * FROM "${SensorManager.sanitize(id)}" ORDER BY time DESC LIMIT 1`
        )).at(0) ?? {};
        return {
            dateOfData: Math.floor((rawData.time?.getNanoTime() ?? 0) / 1_000_000),
            data: Object.entries(rawData).map(([dataType, data]) => ({
                type: dataType,
                value: data
            }))
        };
    }


    /**
     * Assainit une séquence afin d'éviter les injections SQL, en n'autorisant que les caractères alphanumériques et les tirets / underscores.
     * Deux tirets étant un commentaire, il faut utiliser le résultat de cette méthode entre guillements dans la requête.
     * @param input La séquence à assainir
     * @private
     */
    private static sanitize(input: string): string {
        return input.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
    }
}

type TypeBySensor = { sensorId: string; typesId: string };

type SensorConfig = {
    sensorId: string,
    types?: {
        id: string,
        display: boolean
    }[],
    label?: string | null
}

/**
 * Gère la configuration des capteurs
 * Cette classe est un singleton, pour l'initialiser, il faut appeler ConfigurationManager.init(), puis on peut récupérer l'instance avec ConfigurationManager.getInstance().
 */
export class ConfigurationManager {
    private static instance: ConfigurationManager;

    private readonly source: sqlite.Database;
    private sensors: Set<string> = new Set<string>();

    private constructor(database: sqlite.Database) {
        this.source = database;
    }

    public static getInstance(): ConfigurationManager {
        if(ConfigurationManager.instance === undefined) {
            throw new Error("Object not initialized, use ConfigurationManager.init() to create.")
        }
        return this.instance;
    }

    /**
     * Initialise la connexion à la base de données et créer les tables si nécessaire.
     */
    public static async init() {
        if(this.instance != null) {
            return this.getInstance();
        }
        let database = await open({
            filename: process.env.CONFIG_DATABASE as string,
            driver: wrapped.Database
        });
        await database.exec(ConfigurationManager.getSQLiteFileContent("create-config.sql"));
        this.instance = new ConfigurationManager(database);
    }

    /**
     * Initialise la classe.
     */
    public async init() {
        (await this.source.all<{ sensorId: string }[]>(
            `SELECT sensor_id AS sensorId FROM "sensors"`)).map(sensor => sensor.sensorId)
            .forEach(sensor_id => this.sensors.add(sensor_id));
    }

    /**
     * Renvoie la configuration actuelle d'un capteur.
     * @param sensorId L'ID du capteur dont on veut la configuration
     */
    public async getConfiguration(sensorId: string): Promise<ConfigurationSensor | null> {
        const labeledSensor = await this.source.get<{ sensorId: string, label: string, urlId: string }>(
            `SELECT sensor_id as sensorId, label, url_id as urlId FROM sensors WHERE sensor_id = ?`, sensorId
        );
        if(labeledSensor == null) {
            return null;
        }
        const types = await this.source.all<{ typeId: string, label: string }[]>(
            `SELECT types_by_sensor.type_id as typeId, label FROM types_by_sensor LEFT JOIN types ON types_by_sensor.type_id = types.type_id WHERE sensor_id = ?`, sensorId
        );
        return {
            label: labeledSensor.label,
            urlId: labeledSensor.urlId,
            type: types.reduce((acc: { [type: string]: string }, curr: { typeId: string, label: string }) => {
                acc[curr.typeId] = curr.label ?? curr.typeId;
                return acc;
            }, {})
        }
    }

    /**
     * Changer la configuration d'un capteur: son label et les types de données qu'il affiche.
     * @param newConfiguration Le changement de configuration
     */
    public async setConfiguration(newConfiguration: SensorConfig) {
        await this.ensureSensorIsPresent(newConfiguration.sensorId);
        const deleteQuery = await this.source.prepare("DELETE FROM types_by_sensor WHERE sensor_id = ? AND type_id = ?");
        const insertQuery = await this.source.prepare("INSERT INTO types_by_sensor (sensor_id, type_id) VALUES (?, ?)");
        const sensor = newConfiguration.sensorId;
        if(newConfiguration.label != null) {
            await this.source.run("UPDATE sensors SET label = ? WHERE sensor_id = ?", [newConfiguration.label, sensor]);
        }
        let configuredTypes = (await this.getTypesBySensorId([sensor]))[sensor];
        for(let typeUpdate of newConfiguration.types ?? []) {
            if(configuredTypes.includes(typeUpdate.id)) {
                if(!typeUpdate.display) {
                    await deleteQuery.run(sensor, typeUpdate.id);
                }
            } else if(typeUpdate.display) {
                await insertQuery.run(sensor, typeUpdate.id);
            }
        }
        await SensorManager.getInstance().updateSensors(sensor);
    }

    /**
     * Générer l'URL d'un capteur s'il n'en a pas déjà une.
     * Renvoie l'actuelle s'il en existe une.
     * @param sensor Le capteur dont on veut l'URL.
     */
    public generateUrlId(sensor: Sensor): string | null {
        let urlId = sensor.getUrlId();
        if(urlId == null) {
            urlId = sensor.generateUrlId();
            SensorManager.getInstance().setUrlId(sensor.getId(), urlId);
            this.ensureSensorIsPresent(sensor.getId()).then(() =>
                this.source.run(`UPDATE sensors SET url_id = ? WHERE sensor_id = ?`, urlId, sensor.getId()).then());
        }
        return urlId;
    }

    /**
     * Révoquer l'URL d'un capteur, les QRCodes associés ne fonctionneront plus.
     * @param sensor Le capteur dont on veut révoquer l'URL
     */
    public revokeUrlId(sensor: Sensor) {
        let urlId = sensor.getUrlId();
        if(urlId != null) {
            sensor.revokeUrlId();
            SensorManager.getInstance().setUrlId(null, urlId);
            this.source.run(`UPDATE sensors SET url_id = NULL WHERE sensor_id = ?`, sensor.getId()).then();
        }
    }

    /**
     * Renvoie les URLs de tous les capteurs.
     */
    public async getUrlIds(): Promise<{ id: string, urlId: string }[]> {
        let newVar = await this.source.all<{ sensor_id: string, url_id: string }[]>(
            `SELECT sensor_id, url_id FROM "sensors"`
        ) ?? [];
        return newVar.map(query => ({ id: query.sensor_id, urlId: query.url_id }));
    }

    /**
     * Renvoie les types de données que chaque capteur affiche.
     * @param sensorsId Les IDs des capteurs dont on veut les types de données
     */
    public async getTypesBySensorId(sensorsId: string[]): Promise<{ [sensorId: string]: string[] }> {
        if(sensorsId.length == 1) {
            const sensor = sensorsId[0];
            return {
                [sensor]: (await this.source.all<{ typeId: string }[]>(
                    `SELECT type_id AS typeId FROM types_by_sensor WHERE sensor_id = ?`, sensor))
                    .map((sensor: { typeId: string }) => sensor.typeId)
            };
        } else if(sensorsId.length > 1) {
            const typesBySensor = (await this.source.all<TypeBySensor[]>(
                `SELECT sensor_id AS sensorId, group_concat(type_id) AS typesId FROM types_by_sensor GROUP BY sensor_id`))
                .filter((sensor: TypeBySensor) => sensorsId.includes(sensor.sensorId))
                .map((sensor: TypeBySensor) => ({ ...sensor, type_id: sensor.typesId.split(",") }));

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
     * @param ids Filtrer les types retournés, seuls les ids présents dans ce tableau sont renvoyés avec leur label
     * @param includeArgument Inclure dans le résultat les ids passés en argument, le résultat pourra contenir des labels nuls
     */
    public async getLabelledDataTypes(ids?: string[], includeArgument?: boolean): Promise<{ id: string, label: string | null }[]> {
        if(ids != null && ids.length == 1) {
            return (await this.source.all<{ id: string, label: string | null }[]>(
                `SELECT type_id AS id, label FROM "types" WHERE type_id = ?`, [ids[0]]));
        }
        let labeledTypes = (await this.source.all<{ id: string, label: string | null }[]>(
            `SELECT type_id AS id, label FROM "types"`));
        if(ids != null) {
            labeledTypes = labeledTypes.filter(type => ids.includes(type.id));
            if(includeArgument) {
                for(let id of ids) {
                    if(labeledTypes.find(type => type.id === id) == null) {
                        labeledTypes.push({ id: id, label: null });
                    }
                }
            }
        }
        return labeledTypes;
    }

    /**
     * Mettre à jour les labels des types de données
     * @param types
     */
    public async setLabelTypes(types: { id: string, label: string | null }[]) {
        const updateQuery = await this.source.prepare("UPDATE types SET label = ? WHERE type_id = ?");
        const insertQuery = await this.source.prepare("INSERT INTO types (type_id, label) VALUES (?, ?)");
        const removeQuery = await this.source.prepare("DELETE FROM types WHERE type_id = ?");

        let configuredTypes = (await this.getLabelledDataTypes(types.map(type => type.id), false))
            .map(labelledType => labelledType.id);
        for(let field of types) {
            if(configuredTypes.includes(field.id)) {
                if(field.label == null) {
                    await removeQuery.run(field.id);
                } else {
                    await updateQuery.run(field.label, field.id);
                }
            } else if(field.label != null) {
                await insertQuery.run(field.id, field.label);
            }
        }
        SensorManager.getInstance().updateSensors().then();
    }

    /**
     * Garantir qu'un ID de capteur soit bien présent dans la base de données.
     * @param sensorId L'ID du capteur
     * @private
     */
    private async ensureSensorIsPresent(sensorId: string) {
        if(!this.sensors.has(sensorId)) {
            this.sensors.add(sensorId);
            await this.source.run("INSERT OR IGNORE INTO sensors (sensor_id) VALUES (?)", [sensorId]);
        }
    }

    /**
     * Renvoie le contenu d'un fichier SQL.
     * @param path Le chemin du fichier dans le dossier 'sql'
     * @private
     */
    private static getSQLiteFileContent(path: string): string {
        return fs.readFileSync(getSQLFile(path)).toString()
    }

    /**
     * Ferme la connexion avec la base de données.
     */
    public close() {
        this.source?.close();
    }

}