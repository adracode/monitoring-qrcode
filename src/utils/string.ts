/**
 * Mettre en forme une séquence avec des valeurs.
 * Ex: Exemple n° {0} pour {1}, avec {0} et {1} les arguments.
 * @param format La chaîne à formatter
 * @param args Les données à mettre dans la chaîne
 */
export function format(format: string, ...args: any[]): string {
    return format.replace(/{(\d+)}/g, (match, index) => args[index]);
}
