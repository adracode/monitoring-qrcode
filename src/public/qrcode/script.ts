/*
function getBox(title: string, qrCode: string) {
    const container = document.createElement("div");
    container.classList.add("qr-container")
    container.textContent = title;

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    const link = document.createElement("a") as HTMLAnchorElement;
    link.href = qrCode;
    link.textContent = "Lien vers le capteur";
    container.appendChild(link);

    const form = document.createElement("form") as HTMLFormElement;
    const setTitle = document.createElement("input") as HTMLInputElement;
    setTitle.type = "input";

    const holder = document.getElementById("qrcodes")!;
    holder.appendChild(container);

    // @ts-ignore
    QRCode.toCanvas(canvas, qrCode, (error) => {
        if (error) {
            console.error(error)
        }
    })
}

fetch("./sensors", {
    method: "POST"
}).then(async res => {
    let data: { sensors: string[] } = await res.json();
    const list = document.getElementById("sensor") as HTMLSelectElement;
    for (const sensor of data.sensors) {
        const optionSensor = document.createElement("option");
        optionSensor.value = optionSensor.text = sensor;
        list.appendChild(optionSensor);
    }
});

let generateQrcode: HTMLFormElement = document.getElementById('generate-qrcode')! as HTMLFormElement;
generateQrcode!.addEventListener('submit', async event => {
    event.preventDefault();
    const data: any = {};
    new FormData(generateQrcode).forEach((value, key) => {
        data[key] = value;
    });
    const response = await fetch('./generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    getBox(data["sensor"], window.location.origin + (await response.json() as any).qrcodeText)
});
*/

for(let changeLabel of document.getElementsByClassName("change-label")){
    function updateLabel(event: Event){
        const input = event.target as HTMLInputElement;
        if(input.value == null || input.value === ""){
            return;
        }
        const identifier = input.id.split("label-")[1]
        fetch("./config/set", {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sensorId: identifier,
                label: input.value
            }),
        }).then();
    }
    changeLabel.addEventListener("keydown", (event) => {
        if((event as KeyboardEvent).key === "Enter"){
            updateLabel(event);
        }
    });
}

for (let setType of document.getElementsByClassName("set-data-type")) {
    setType.addEventListener("click", (event) => {
        const checkBox = event.target as HTMLInputElement;
        const identifier = checkBox.id.split(":");
        if(identifier.length !== 2){
            console.error("Le type de données n'a pas pu être identifié, merci de recharger la page");
            return;
        }
        fetch("./config/set", {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sensorId: identifier[0],
                typeId: identifier[1],
                set: checkBox.checked
            }),
        }).then();
    })
}