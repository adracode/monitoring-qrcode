import crypto from "crypto";

export type SensorData = { type: string, value: any };
export type SensorsData = SensorData[];
export type TypesLabel = { [type: string]: string };
export type ConfigurationSensor = Partial<{
    label: string,
    type: TypesLabel,
    urlId: string
}>;

export type SensorSetting = {
    value: any,
    label?: string
}
type SensorSettings = {
    [id: string]: SensorSetting
}

export class Sensor {
    private static readonly settings: SensorSettings = {
        updateInterval: { value: 10 * 60 * 1_000 },
        expirationTime: { value: 30 * 60 * 1_000 },
        tokenExpirationTime: { value: 30 * 60 * 1_000 },
        deleteTokenInterval: { value: 60 * 60 * 24 * 1_000 },
        adminPassword: { value: undefined }
    }

    private readonly id: string;
    private lastDatabaseUpdate: number = 0;
    private dateOfData: number = 0;
    private data: SensorsData = [];
    private config: ConfigurationSensor = {}

    constructor(id: string) {
        this.id = id;
    }

    /**
     * Modifier un paramètre de la configuration générale.
     * @param id
     * @param value
     * @param label
     */
    public static setSetting(id: string, value: any, label?: string) {
        let setting = Sensor.settings[id] = {...Sensor.settings[id], value};
        if(label != null){
            setting.label = label;
        }
    }

    /**
     * Récupérer un paramètre de la configuration générale.
     * @param id
     */
    public static getSetting<T>(id: string): T {
        return Sensor.settings[id]?.value as T;
    }

    public static getPublicSettings(): SensorSetting[] {
        return Object.entries(this.settings).filter(([, setting]) => setting.label != null).map(([id, setting]) => ({...setting, id: id}));
    }

    public static isSettingPublic(id: string) : boolean {
        return Sensor.settings[id].label != null;
    }

    /**
     * Savoir si les données du capteur ont besoin d'être mise à jour.
     */
    public needUpdate(): boolean {
        return this.lastDatabaseUpdate < Date.now() - Sensor.settings.updateInterval.value;
    }

    /**
     * Modifier la configuration du capteur.
     * @param config
     */
    public setConfiguration(config: ConfigurationSensor) {
        this.config = config;
        if(config.label == null || config.label == "") {
            this.config.label = undefined;
        }
    }

    /**
     * Modifier les données du capteur.
     * @param dateOfData Date de mise à jour des données
     * @param data
     */
    public setData(dateOfData: number, data: SensorsData) {
        this.lastDatabaseUpdate = Date.now();
        this.dateOfData = dateOfData;
        this.data = data;
    }

    /**
     * Récupérer des données.
     * Si les données sont expirées, ne renvoie rien.
     * @param type Les types de données à récupérer
     */
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

    /**
     * Vérifier si les données sont expirés.
     * Peut arriver si le capteur physique n'envoie plus de données.
     */
    public isExpired(): boolean {
        return this.dateOfData < Date.now() - Sensor.settings.expirationTime.value;
    }

    /**
     * Vérifier si le capteur a des données.
     */
    public isEmpty(): boolean {
        return this.data.length === 0;
    }

    /**
     * Vérifier si le capteur a une configuration.
     */
    public hasConfig(): boolean {
        return Object.keys(this.config).length !== 0;
    }

    /**
     * Récupérer l'ID du capteur.
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Récupérer le label du capteur.
     */
    public getTitle(): string {
        return this.config.label ?? this.getId();
    }

    /**
     * Récupérer le label brut du capteur.
     */
    public getRawTitle(): string | undefined {
        return this.config.label;
    }

    /**
     * Récupérer l'URL du capteur.
     */
    public getUrlId(): string | undefined {
        return this.config.urlId;
    }

    /**
     * Générer l'URL du capteur.
     */
    public generateUrlId(): string {
        return this.config.urlId = crypto.randomBytes(33).toString("base64url");
    }

    /**
     * Révoquer l'URL du capteur.
     */
    public revokeUrlId() {
        this.config.urlId = undefined;
    }
}
