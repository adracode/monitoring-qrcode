function drawQrCode(text: string) {
    const container = document.createElement("div");
    container.classList.add("qr-container")
    const canvas = document.createElement('canvas');
    const holder = document.getElementById("qrcodes")!;
    container.appendChild(canvas);
    const link = document.createElement("a") as HTMLAnchorElement;
    link.href = text;
    link.textContent = "Lien vers le capteur";
    container.appendChild(link);
    holder.appendChild(container);
    // @ts-ignore
    QRCode.toCanvas(canvas, text, (error) => {
        if (error) {
            console.error(error)
        }
        console.log('success!');
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
    drawQrCode(window.location.origin + (await response.json() as any).qrcodeText)
});
