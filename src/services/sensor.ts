export type SensorData = { type: string, value: string | number }
export type SensorsData = SensorData[];

export class Sensor {
    private static readonly UPDATE_INTERVAL = 10 * 60 * 1_000;

    private id: string;
    private name: string;
    private lastUpdate: number = 0;
    private data: SensorsData = [];

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    public needUpdate(): boolean {
        return this.lastUpdate < Date.now() - Sensor.UPDATE_INTERVAL;
    }

    public set(data: SensorsData) {
        this.lastUpdate = Date.now();
        this.data = data;
    }

    public get(type: string[]): SensorsData {
        return this.getAll().filter((value: SensorData) => type.includes(value.type));
    }

    public getAll(): SensorsData {
        return structuredClone(this.data);
    }

    public isEmpty(): boolean {
        return this.data.length === 0;
    }

    public getId(): string {
        return this.id;
    }
}
