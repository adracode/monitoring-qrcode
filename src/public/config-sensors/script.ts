
fetch("./get-config", {
    method: "GET"
}).then(async res => {
    let data = await res.json();
    const list = document.getElementById("sensors") as HTMLDivElement;
    for (const sensor of Object.keys(data.sensors)) {
        const listItem = document.createElement('div');
        listItem.className = "box"
        const item = document.createElement('div');
        const input = document.createElement('input');
        input.type = 'text';
        item.appendChild(document.createTextNode(sensor));
        item.appendChild(input)
        listItem.appendChild(item)
        //@ts-ignore
        data.sensors[sensor].forEach(element => {
            const item = document.createElement('div');
            item.appendChild(document.createTextNode(element.name))
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = element.isChecked;
            item.appendChild(checkbox);
            listItem.appendChild(item);
        });
        list.appendChild(listItem);
    }
});

document.getElementById("submitButton")!.onclick = async function () {
    const list = document.getElementById("sensors") as HTMLDivElement;
    let data: any = {}
    for (let sensor of list.children) {
        let divs = sensor.children;
        let fields = Array.from(divs).slice(1)
        let sensorName = divs[0].textContent;
        let sensorLabel = (divs[0].children[0] as HTMLInputElement).value;
        let resultFields: { name: string | null, checked: boolean }[] = fields.map(field => {
            let fieldName = field.textContent
            let fieldChecked = (field.children[0] as HTMLInputElement).checked
            return { name: fieldName, checked: fieldChecked }
        });
        data[sensorName!] = { label: sensorLabel, fields: resultFields };
    }
    console.log(data);
    const response = await fetch('./set-config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
}