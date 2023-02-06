
fetch("./get-config", {
    method: "GET"
}).then(async res => {
    let data = await res.json();
    const list = document.getElementById("fields") as HTMLDivElement;
    for (const field of data.fields) {
        const listItem = document.createElement('div');
        listItem.appendChild(document.createTextNode(field.type_id));
        const input = document.createElement('input');
        input.type = 'text';
        input.value = field.label ?? "";
        listItem.appendChild(input)
        list.appendChild(listItem);
    }
});

document.getElementById("submitButton")!.onclick = async function () {
    const list = document.getElementById("fields") as HTMLDivElement;
    let data: {name: string | null, label: string}[] = Array.from(list.children).map(field =>{
        let fieldName = field.textContent;
        let fieldLabel = (field.children[0] as HTMLInputElement).value;
        return {name: fieldName, label: fieldLabel};
    });
    console.log(data);
    const response = await fetch('./set-config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
}