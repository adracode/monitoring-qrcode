import crypto from "crypto";
import { Sensor } from "./sensor";

/**
 * Gestion de l'authentification admin.
 */
export class TokenManager {
    private static instance: TokenManager

    private tokens: Map<string, number> = new Map<string, number>();

    private constructor() {
    }

    public static getInstance(): TokenManager {
        if(TokenManager.instance === undefined) {
            throw new Error("Object not initialized, use TokenManager.init() to create.")
        }
        return TokenManager.instance;
    }

    public static async init() {
        this.instance = new TokenManager();
    }

    /**
     * Créer un token d'authentification.
     */
    public createToken(): string {
        const token = crypto.randomBytes(33).toString("base64url");
        this.tokens.set(token, Date.now() + Sensor.getSetting<number>("tokenExpirationTime"));
        return token;
    }

    /**
     * Vérifier que le token est valide.
     * @param token
     */
    public isValid(token: string): boolean {
        if(this.tokens.has(token)) {
            if(Date.now() < this.tokens.get(token)!) {
                return true;
            } else {
                this.deleteToken(token);
                return false;
            }
        } else {
            return false;
        }
    }

    /**
     * Supprimer un token.
     * L'utilisateur connecté avec ce token sera déconnecté.
     * @param token
     */
    public deleteToken(token: string) {
        this.tokens.delete(token);
    }

    /**
     * Supprimer tous les tokens.
     */
    public deleteAllTokens() {
        this.tokens.clear();
    }

    /**
     * Supprimer tous les tokens invalides.
     */
    public deleteInvalidToken() {
        for(const token of this.tokens.keys()) {
            if(Date.now() > this.tokens.get(token)!) {
                this.deleteToken(token);
            }
        }
    }
}
