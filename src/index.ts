import app from "./app"
import {ConfigurationManager, SensorManager} from "./services/data-management";

const port = Number(process.env.PORT) || 3000;

(async () => {
    console.log("Initialisation de la connexion aux bases de données")
    await SensorManager.init();
    await ConfigurationManager.init();
    console.log("Préparation de la gestion des données")
    await SensorManager.getInstance().init();
    await ConfigurationManager.getInstance().init();
    app.listen(port, () => console.log(`Serveur en écoute sur le port ${port}`));
    process.on('exit', () => ConfigurationManager.getInstance().close());
})();

