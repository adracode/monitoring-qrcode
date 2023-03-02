import crypto from "crypto";
import { Sensor } from "./sensor";

export class TokenManager {
    private static instance: TokenManager

    private tokens: Map<string, number> = new Map<string, number>();

    private constructor() {}

    public static getInstance(): TokenManager {
        if (TokenManager.instance === undefined) {
            throw new Error("Object not initialized, use TokenManager.init() to create.")
        }
        return TokenManager.instance;
    }

    public static async init() {
        this.instance = new TokenManager();
    }

    public createToken(): string{
        const token = crypto.randomBytes(33).toString("base64url");
        this.tokens.set(token, Date.now() + Sensor.getSetting<number>("tokenExpirationTime"));
        return token;
    }

    public isValid(token: string): boolean{
        if(this.tokens.has(token)){
            if(Date.now() < this.tokens.get(token)!){
                return true;
            } else {
                this.deleteToken(token);
                return false;
            }
        } else{
            return false;
        }
    }

    public deleteToken(token: string){
        this.tokens.delete(token);
    }

    public deleteInvalidToken(){
        for (const token of this.tokens.keys()) {
            if(!this.isValid(token)){
                this.deleteToken(token);
            }
        }
    }
}
