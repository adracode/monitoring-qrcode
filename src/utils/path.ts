import path from "path";

export function getPathPage(pathPage: string){
    return path.join(__dirname, '/../public/', pathPage);
}

export function getSQLFile(pathFile: string){
    return path.join(__dirname, '/../sql/', pathFile);
}