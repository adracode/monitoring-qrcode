function getSensorId(): string | null {
    return new URLSearchParams(window.location.search).get("s");
}

function hide(element: HTMLElement) {
    element.classList.add("hidden")
}

function show(element: HTMLElement) {
    element.classList.remove("hidden")
}

const sensorId = getSensorId();
if (sensorId != null) {
    let loading = document.getElementById("loading")!;
    const timeOut = setTimeout(() => {
        show(loading);
    }, 1000);
    fetch(`/sensors/${sensorId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    }).then(async data => {
        let res = await data.json();
        clearTimeout(timeOut);
        if (res.hasOwnProperty("message")) {
            console.log(res.message);
            return;
        }
        const sensorDataElement = document.getElementById("data")!;
        res.forEach((response: { data: string }) => {
            const data = response.data.split(":")
            let container: HTMLDivElement = document.createElement("div");
            container.classList.add("box");
            container.innerHTML = `
                <h4>${data[0]}</h4>
                <h3>${data[1]}</h3>
            `;
            sensorDataElement.appendChild(container);
        });
        show(sensorDataElement);
        hide(loading);
    }).catch(error => console.error(error));
} else {
    show(document.getElementById("noSensor")!);
}

