function drawQrCode(text: string) {
    let canvas: HTMLCanvasElement | null = document.getElementById('canvas-qrcode') as HTMLCanvasElement;
    if(canvas === null){
        canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
    }
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
    let data: {sensors: string[]} = await res.json();
    const list = document.getElementById("sensor") as HTMLSelectElement;
    console.log(data.sensors)
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
    drawQrCode((await response.json() as any).qrcodeText)
});
