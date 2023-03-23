import crypto from "crypto";
import fs from "fs";
import { Sensor } from "./sensor";

/**
 * Changer le mot de passe admin dans la configuration.
 * @param newHash Hash du nouveau mot de passe
 */
function changePasswordInRunningConfig(newHash: string) {
    Sensor.setSetting("adminPassword", newHash);
}

/**
 * Changer le mot de passe admin dans le fichier de configuration .
 * @param newHash Hash du nouveau mot de passe
 */
function changePasswordInFile(newHash: string) {
    try {
        let jsonString = JSON.parse(fs.readFileSync("config.json", "utf-8"));
        jsonString.adminPassword = newHash;
        fs.writeFileSync("config.json", JSON.stringify(jsonString, null, 4));
    } catch(e) {
        throw(e);
    }
}

/**
 * Changer le mot de passe admin depuis l'interface web.
 * @param newPassword Nouveau mot de passe
 */
function changePasswordFromWeb(newPassword: string): boolean {
    try {
        const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
        changePasswordInFile(newHash);
        changePasswordInRunningConfig(newHash);
        return true;
    } catch(e) {
        console.log(e)
        console.error("Can't change password");
        return false;
    }
}

module.exports = { changePasswordFromWeb };