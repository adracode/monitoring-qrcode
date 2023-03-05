import { Sensor } from "../services/sensor";
import fs from "fs";

function changePasswordInRunningConfig(newHash: string){
    Sensor.setSetting("adminPassword", newHash);
}

function changePasswordInFile(newHash: string){
    try {
        var jsonString = JSON.parse(fs.readFileSync("config.json", "utf-8"));
        jsonString.adminPassword = newHash;
        fs.writeFileSync("config.json", JSON.stringify(jsonString));
    } catch (e) {
        throw(e);
    }
}

const changePasswordFromWeb = (newPassword: string): boolean => {
    try{
        var crypto = require('crypto');
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

const changePasswordFromExternal = (newPassword: string): boolean => {
    try{
        var crypto = require('crypto');
        const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
        changePasswordInFile(newHash);
        return true;
    } catch(e) {
        console.log(e)
        console.error("Can't change password");
        return false;
    }
    
}

module.exports = {changePasswordFromWeb, changePasswordFromExternal};