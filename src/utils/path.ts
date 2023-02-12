import path from "path";

export function getPublic(pathPage: string){
    return path.join(__dirname, '/../../build/public/', pathPage);
}

export function getView(view: string){
    return path.join(__dirname, '/../views/', view);
}

export function getSQLFile(pathFile: string){
    return path.join(__dirname, '/../sql/', pathFile);
}