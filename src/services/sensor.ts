import crypto from "crypto";

export type SensorData = { type: string, value: any };
export type SensorsData = SensorData[];
export type TypesLabel = { [type: string]: string };
export type ConfigurationSensor = Partial<{
    label: string,
    type: TypesLabel,
    urlId: string
}>;
type SensorSetting = {
    [id: string]: any
}

export class Sensor {
    private static readonly settings: SensorSetting = {
        updateInterval: 10 * 60 * 1_000,
        expirationTime: 30 * 60 * 1_000,
        tokenExpirationTime: 30 * 60 * 1_000,
        deleteTokenInterval: 60 * 60 * 24 * 1_000,
        adminPassword: undefined
    }

    private readonly id: string;
    private lastDatabaseUpdate: number = 0;
    private dateOfData: number = 0;
    private data: SensorsData = [];
    private config: ConfigurationSensor = {}

    constructor(id: string) {
        this.id = id;
    }

    public static setSetting(id: string, value: any) {
        Sensor.settings[id] = value;
    }

    public static getSetting<T>(id: string): T {
        return Sensor.settings[id] as T;
    }

    public needUpdate(): boolean {
        return this.lastDatabaseUpdate < Date.now() - Sensor.settings.updateInterval;
    }

    public setConfiguration(config: ConfigurationSensor) {
        this.config = config;
        if(config.label == null || config.label == "") {
            this.config.label = undefined;
        }
    }

    public setData(dateOfData: number, data: SensorsData) {
        this.lastDatabaseUpdate = Date.now();
        this.dateOfData = dateOfData;
        this.data = data;
    }

    public get(type?: string[]): SensorsData {
        if(this.isExpired()) {
            return [];
        }
        const types = type ?? Object.keys(this.config.type ?? {});
        return this.data
            .filter((data: SensorData) => types.includes(data.type))
            .map((data: SensorData) => ({
                ...data,
                type: this.config.type?.[data.type] ?? data.type
            }));
    }

    public isExpired(): boolean {
        return this.dateOfData < Date.now() - Sensor.settings.expirationTime;
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

    public revokeUrlId() {
        this.config.urlId = undefined;
    }
}
