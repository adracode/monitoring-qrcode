import {InfluxDB} from "influx";

type SensorData = { [type: string]: string | number };
type SensorName = { name: string };

class Sensor {
    private static readonly UPDATE_INTERVAL = 10 * 60 * 1_000;

    private id: string;
    private name: string;
    private lastUpdate: number = 0;
    private data: SensorData = {}

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    public needUpdate(): boolean {
        console.log(this.lastUpdate, Date.now(), Sensor.UPDATE_INTERVAL)
        return this.lastUpdate < Date.now() - Sensor.UPDATE_INTERVAL;
    }

    public set(data: SensorData) {
        this.lastUpdate = Date.now();
        this.data = data;
    }

    public get(type: string): string | number {
        return this.data[type];
    }

    public getAll(): SensorData {
        return structuredClone(this.data);
    }
}

export class DataManager {

    private static instance: DataManager;

    private constructor() {
    }

    public static getInstance(): DataManager {
        if (DataManager.instance === undefined) {
            DataManager.instance = new DataManager();
        }
        return DataManager.instance;
    }

    private source = new InfluxDB({
        protocol: "https",
        host: process.env.INFLUXDB_HOST,
        port: 443,
        path: process.env.INFLUXDB_PATH,
        database: process.env.INFLUXDB_DATABASE,
        username: process.env.INFLUXDB_USERNAME,
        password: process.env.INFLUXDB_PASSWORD
    });

    private sensors: Map<string, Sensor> = new Map<string, Sensor>();

    public async getAllSensorsId(): Promise<string[]> {
        return (await this.source.query<SensorName>(`SHOW MEASUREMENTS`)).map(sensor => sensor.name);
    }

    public async getSensor(id: string): Promise<Sensor> {
        id = DataManager.sanitize(id);
        if (!this.sensors.has(id)) {
            this.sensors.set(id, new Sensor(id, id));
        }
        let sensor: Sensor = this.sensors.get(id)!;
        if (sensor.needUpdate()) {
            sensor.set(await this.getDatabaseSensorData(id));
        }
        return sensor;
    }

    private async getDatabaseSensorData(id: string): Promise<SensorData> {
        return (await this.source.query<SensorData>(
            `SELECT * FROM "${DataManager.sanitize(id)}" ORDER BY time DESC LIMIT 1`
        )).at(0) ?? {};
    }

    private static sanitize(input: string): string {
        return input.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
    }

}