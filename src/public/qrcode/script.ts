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

let generateQrcode: HTMLFormElement = document.getElementById('generate-qrcode')! as HTMLFormElement;

generateQrcode!.addEventListener('submit', async event => {
    event.preventDefault();
    const data: any = {};
    new FormData(generateQrcode).forEach((value, key) => {
        data[key] = value;
    });
    const response = await fetch('/qrcode/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    drawQrCode((await response.json() as any).qrcodeText)
});
