enum Mode {
    CONFIG,
    QRCODES,
    PRINT,
    LABEL,
}

let mode = Mode.CONFIG;
let loadedQRCodes = false;
let selected: Element[] = [];

for(let setType of document.getElementsByClassName("set-data-type")) {
    setType.addEventListener("click", async (event) => {
        if(mode != Mode.CONFIG) {
            return;
        }
        const checkBox = event.target as HTMLInputElement;
        const identifier = checkBox.id.split(":");
        if(identifier.length !== 2) {
            console.error("Le type de données n'a pas pu être identifié, merci de recharger la page");
            return;
        }
        (setType as HTMLInputElement).disabled = true;
        await fetch("./set", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sensorId: identifier[0],
                typeId: identifier[1],
                set: checkBox.checked
            }),
        });
        (setType as HTMLInputElement).disabled = false;
    })
}
const hide = (element: Element) => element.classList.add("hidden");
const show = (element: Element) => element.classList.remove("hidden");

const dynamic: {
    [id: string]: {
        visibility: NodeListOf<Element>,
        performOnElements?: {
            elements: NodeListOf<Element>,
            onSelect?: (element: Element) => void,
            onQuit?: (element: Element) => void,
        }[],
        onSelect?: () => void,
        onQuit?: () => void
    }
} = {
    config: {
        visibility: document.querySelectorAll("#qrcodes, .input-data-type, .form-change-label.for-qrcode"),
        onSelect: () => mode = Mode.CONFIG
    },
    qrcode: {
        visibility: document.querySelectorAll("#qrcodes, .qr-code-svg, .link-sensor, .generate-qrcode, .revoke-qrcode"),
        performOnElements: [{
            elements: document.querySelectorAll(".link-sensor"),
            onSelect: (element: Element) => {
                if(element.getAttribute("href") == "") {
                    hide(element);
                }
            }
        }, {
            elements: document.querySelectorAll(".generate-qrcode"),
            onSelect: (element => {
                if(hasURL(element.parentElement!)) {
                    hide(element);
                }
            })
        }, {
            elements: document.querySelectorAll(".revoke-qrcode"),
            onSelect: (element => {
                if(!hasURL(element.parentElement!)) {
                    hide(element);
                }
            })
        }],
        onSelect: async () => {
            mode = Mode.QRCODES;
            await loadQrCodes();
        }
    },
    print: {
        visibility: document.querySelectorAll("#qrcodes, .qr-code-svg, .print-qrcodes"),
        performOnElements: [{
            elements: document.querySelectorAll(".qr-container"),
            onSelect: (element) => {
                if(!hasURL(element)) {
                    hide(element);
                }
                element.classList.add("clickable")
                if(selected.includes(element)) {
                    element.classList.add("selected");
                }
            },
            onQuit: (element) => {
                show(element);
                element.classList.remove("clickable", "selected")
            }
        }],
        onSelect: async () => {
            mode = Mode.PRINT;
            await loadQrCodes();
        }
    },
    label: {
        visibility: document.querySelectorAll("#labels"),
        onSelect: () => mode = Mode.LABEL
    }
}

for(let tab of document.getElementsByClassName("select-page")) {
    tab.addEventListener("click", async (event) => {
        const nextId = tab.id.split("select-")[1];
        for(let [key, value] of Object.entries(dynamic)) {
            if(key !== nextId) {
                if(value.onQuit != null) {
                    await value.onQuit();
                }
                value.visibility.forEach(hide);
                value.performOnElements?.forEach(elements => {
                    if(elements.onQuit != null) {
                        elements.elements.forEach(element => elements.onQuit!(element));
                    }
                });
            }
        }
        const next = dynamic[nextId];
        if(next.onSelect != null) {
            await next.onSelect();
        }
        next.visibility.forEach(show);
        next.performOnElements?.forEach(elements => {
            if(elements.onSelect != null) {
                elements.elements.forEach(element => elements.onSelect!(element));
            }
        });
    })
}

function hasURL(qrContainer: Element): boolean {
    return qrContainer.querySelector(".link-sensor")?.getAttribute("href") != ""
}

async function loadQrCodes() {
    if(!loadedQRCodes) {
        loadedQRCodes = true;
        const res = await fetch("./get-qrcodes", {
            method: "GET"
        });
        let qrCodes: { [id: string]: { qrcode: string, link: string } } = await res.json();
        for(let [key, value] of Object.entries(qrCodes)) {
            const div = document.getElementById(key)!;
            (div.querySelector(".qr-code-svg")! as HTMLImageElement).src = value.qrcode;
            (div.querySelector(".link-sensor")! as HTMLLinkElement).href = value.link;
        }
    }
}

for(let container of document.getElementsByClassName("qr-container")) {
    container.addEventListener("click", (event) => {
        if(mode != Mode.PRINT) {
            return;
        }
        if(container.classList.contains("selected")) {
            container.classList.remove("selected");
            selected.splice(selected.indexOf(container), 1)
        } else {
            container.classList.add("selected")
            selected.push(container)
        }
    })
}

for(let generate of document.getElementsByClassName("generate-qrcode")) {
    generate.addEventListener("click", async () => {
        const sensor = generate.parentElement!;
        const res = await fetch("./generate", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sensor: sensor.id })
        })
        let qrCode: { qrcode: string, link: string } = await res.json();
        const image: HTMLImageElement = sensor.querySelector(".qr-code-svg")!;
        image.src = qrCode.qrcode;
        const link: HTMLLinkElement = sensor.querySelector(".link-sensor")!;
        link.href = qrCode.link;
        show(image);
        show(link);
        hide(sensor.querySelector(".generate-qrcode")!)
        show(sensor.querySelector(".revoke-qrcode")!)

    });
}

const modal = document.getElementById("confirm-revoke")!;

function closeConfirm() {
    modal.style.display = "none";
    //document.body.style.overflow = "auto";
    selectionRevoke.classList.remove("hover");
}

const modalTitle = document.getElementById("confirm-revocation-title")!;

function openConfirm() {
    modal.style.display = "flex";
    //document.body.style.overflow = "hidden";
    selectionRevoke.classList.add("hover");
    modalTitle.textContent = `Confirmer la révocation: ${selectionRevoke.parentElement!.id}`;
}

window.onclick = function(event) {
    if(event.target == modal) {
        closeConfirm();
    }
}

let selectionRevoke: HTMLElement;
for(let revoke of document.getElementsByClassName("revoke-qrcode")) {
    revoke.addEventListener("click", async () => {
        selectionRevoke = revoke as HTMLElement;
        openConfirm();
    });
}

document.getElementById("cancel-revoke-button")!.addEventListener("click", closeConfirm);
document.getElementById("confirm-revoke-button")!.addEventListener("click", async event => {
    const sensor = selectionRevoke.parentElement!;
    (event.target as HTMLButtonElement).disabled = true
    await fetch("./revoke", {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sensor: sensor.id })
    });
    (event.target as HTMLButtonElement).disabled = false;
    const image: HTMLImageElement = sensor.querySelector(".qr-code-svg")!;
    image.src = "";
    const link: HTMLLinkElement = sensor.querySelector(".link-sensor")!;
    link.href = "";
    hide(image);
    hide(link);
    show(sensor.querySelector(".generate-qrcode")!)
    hide(sensor.querySelector(".revoke-qrcode")!)
    closeConfirm();
});

let labelsValue: { [id: string]: string | null } = {};

for(let input of document.querySelectorAll(".change-label")) {
    labelsValue[input.id] = input.textContent;
    input.addEventListener("keydown", event => {
        if((event as KeyboardEvent).key === "Enter") {
            event.preventDefault()
        }
    });
    input.addEventListener("input", (event) => {
        if(!input.classList.contains("modified")) {
            input.classList.add("modified")
        }
        if(input.classList.contains("validated")) {
            input.classList.remove("validated")
        }
        if((input as HTMLTextAreaElement).value === labelsValue[input.id]) {
            input.classList.remove("modified")
        }
    });
    input.addEventListener("focus", event => {
        input.classList.remove("modified", "validated")
    });
    input.addEventListener("blur", event => {
        if(input.classList.contains("modified")) {
            (input as HTMLTextAreaElement).value = labelsValue[input.id]!;
        }
    });
}

for(let changeLabel of document.querySelectorAll(".form-change-label.for-qrcode > .change-label")) {
    changeLabel.addEventListener("keydown", async (event) => {
        if((event as KeyboardEvent).key === "Enter") {
            if(mode != Mode.CONFIG || !changeLabel.classList.contains("modified")) {
                return;
            }
            const input = event.target as HTMLTextAreaElement;
            const identifier = input.id.split("label-")[1]
            input.classList.remove("modified")
            await fetch("./set", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sensorId: identifier,
                    label: input.value
                }),
            });
            labelsValue[input.id] = input.value;
            input.classList.add("validated");
        }
    });
}

for(let changeLabel of document.querySelectorAll(".form-change-label.for-type > .change-label")) {
    changeLabel.addEventListener("keydown", async (event) => {
        if((event as KeyboardEvent).key === "Enter") {
            if(mode != Mode.LABEL || !changeLabel.classList.contains("modified")) {
                return;
            }
            const input = event.target as HTMLInputElement;
            const identifier = input.id.split("label-")[1]
            input.classList.remove("modified")
            await fetch("./set-label", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    typeId: identifier,
                    label: input.value == null || input.value === "" ? null : input.value
                }),
            })
            labelsValue[input.id] = input.value;
            input.classList.add("validated");
        }
    });
}

for(let disconnect of document.querySelectorAll(".disconnect-button")) {
    disconnect.addEventListener("click", async (event) => {
        let res = await fetch("./disconnect", {
            method: "POST"
        });
        window.location.href = res.url;
    });
}

for(let disconnect of document.querySelectorAll(".change-password-button")) {
    disconnect.addEventListener("click", async (event) => {
        window.location.href = "/password";
    });
}

for(let printButton of document.querySelectorAll(".print-qrcodes")) {
    printButton.addEventListener("click", (event) => {
        let printed = initPrint(Array.prototype.slice.call(document.querySelectorAll(".selected > .qr-code-svg")).map(img => ({
            title: img.parentElement.id,
            img: img
        })));
        window.print();
        printed.remove();
    });
}

function initPrint(qrcodes: { title: string, img: HTMLImageElement }[]): HTMLDivElement {
    let chunks: { title: string, img: HTMLImageElement }[][] = []
    for(let i = 0; i < qrcodes.length; i += 6) {
        chunks.push(qrcodes.slice(i, i + 6));
    }
    const allPages = document.createElement("div");
    allPages.classList.add("print");
    for(const chunk of chunks) {
        const page = document.createElement("div");
        page.classList.add("page");
        allPages.appendChild(page);
        for(const [index, qrcode] of chunk.entries()) {
            const clone = qrcode.img.cloneNode() as HTMLImageElement;
            const qrcodeDiv = document.createElement("div");
            qrcodeDiv.classList.add(`img-${index}`, "qrcode-img-container");
            const title = document.createElement("p");
            title.textContent = qrcode.title;
            qrcodeDiv.appendChild(title)
            qrcodeDiv.appendChild(clone)
            page.appendChild(qrcodeDiv);
        }
    }
    document.body.appendChild(allPages)
    return allPages;
}