import path from "path";

/**
 * Récupérer un fichier se situant dans le dossier 'public'.
 * @param pathPage
 */
export function getPublic(pathPage: string) {
    return path.join(__dirname, '/../../build/public/', pathPage);
}

/**
 * Récupérer un fichier se situant dans le dossier 'view'.
 * @param view
 */
export function getView(view: string) {
    return path.join(__dirname, '/../views/', view);
}

/**
 * Récupérer un fichier se situant dans le dossier 'sql'.
 * @param pathFile
 */
export function getSQLFile(pathFile: string) {
    return path.join(__dirname, '/../sql/', pathFile);
}