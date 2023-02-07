function getSensorId(): string | null {
    return new URLSearchParams(window.location.search).get("s");
}

function hide(element: HTMLElement) {
    element.classList.add("hidden")
}

function show(element: HTMLElement) {
    element.classList.remove("hidden")
}

function displayData(parent: HTMLElement, toDisplay: { title: string, data: string }[]) {
    toDisplay.forEach((data: { title: string, data: string }) => {
        let container: HTMLDivElement = document.createElement("div");
        container.classList.add("box");
        container.innerHTML = `
                <h4>${data.title}</h4>
                <h3>${data.data}</h3>
            `;
        parent.appendChild(container);
    });
}

const sensorDataElement = document.getElementById("data")!;
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
        let res: { sensorTitle: string, data: string[] } = await data.json();
        clearTimeout(timeOut);
        const sensorTitle = document.getElementById("sensor-name")!;
        if (res.sensorTitle !== undefined) {
            sensorTitle.innerText = res.sensorTitle
            show(sensorTitle)
        }
        displayData(sensorDataElement, res.data.map((dataType: string) => {
            const titleAndData = dataType.split(":");
            return {title: titleAndData[0], data: titleAndData[1]}
        }));
        show(sensorDataElement);
        hide(loading);
    }).catch(error => console.error(error));
} else {
    displayData(sensorDataElement, [{title: "Erreur", data: "Aucun capteur précisé"}]);
}

