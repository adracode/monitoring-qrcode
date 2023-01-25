class SensorConfiguration {

    private id: string;
    private types: string[] = [];

    constructor(id: string, types?: string[]) {
        this.id = id;
        if(types !== undefined) {
            this.types = types;
        }
    }
}