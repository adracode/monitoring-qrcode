export function format(format: string, ...args: any[]): string {
    return format.replace(/{(\d+)}/g, (match, index) => args[index]);
}
