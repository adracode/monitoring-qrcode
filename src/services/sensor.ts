import crypto from "crypto";

export type SensorData = { type: string, value: string | number };
export type SensorsData = SensorData[];
export type TypesLabel = { [type: string]: string };
export type ConfigurationSensor = Partial<{
    label: string,
    type: TypesLabel,
    urlId: string
}>;

export class Sensor {
    private static readonly UPDATE_INTERVAL = 10 * 60 * 1_000;

    private readonly id: string;
    private lastUpdate: number = 0;
    private data: SensorsData = [];
    private config: ConfigurationSensor = {}

    constructor(id: string) {
        this.id = id;
    }

    public needUpdate(): boolean {
        return this.lastUpdate < Date.now() - Sensor.UPDATE_INTERVAL;
    }

    public setConfiguration(config: ConfigurationSensor) {
        this.config = config;
        if(config.label == ""){
            this.config.label = undefined;
        }
    }

    public setData(data: SensorsData) {
        this.lastUpdate = Date.now();
        this.data = data;
    }

    public get(type?: string[]): SensorsData {
        const types = type ?? Object.keys(this.config.type ?? {});
        return this.data
            .filter((data: SensorData) => types.includes(data.type))
            .map((data: SensorData) => ({
                ...data,
                type: this.config.type?.[data.type] ?? data.type
            }));
    }

    public isEmpty(): boolean {
        return this.data.length === 0;
    }

    public hasConfig(): boolean {
        return Object.keys(this.config).length !== 0;
    }

    public getId(): string {
        return this.id;
    }

    public getTitle(): string {
        return this.config.label ?? this.getId();
    }

    public getRawTitle(): string | undefined {
        return this.config.label;
    }

    public getUrlId(): string | undefined {
        return this.config.urlId;
    }

    public generateUrlId(): string {
        return this.config.urlId = crypto.randomBytes(33).toString("base64url");
    }
}
