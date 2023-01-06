import path from "path";

export default function getPathPage(pathPage: string){
    return path.join(__dirname, '/../public/', pathPage);
}