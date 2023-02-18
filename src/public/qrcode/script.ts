enum Mode {
    CONFIG,
    QRCODES,
    PRINT
}

let mode = Mode.CONFIG;
let loadedQRCodes = false;
let selected: Element[] = [];

for (let changeLabel of document.getElementsByClassName("change-label")) {
    function updateLabel(event: Event) {
        if (mode != Mode.CONFIG) {
            return;
        }
        const input = event.target as HTMLInputElement;
        if (input.value == null || input.value === "") {
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
        if ((event as KeyboardEvent).key === "Enter") {
            updateLabel(event);
        }
    });
}
for (let setType of document.getElementsByClassName("set-data-type")) {
    setType.addEventListener("click", (event) => {
        if (mode != Mode.CONFIG) {
            return;
        }
        const checkBox = event.target as HTMLInputElement;
        const identifier = checkBox.id.split(":");
        if (identifier.length !== 2) {
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
        visibility: document.querySelectorAll(".input-data-type, .form-change-label"),
        onSelect: () => mode = Mode.CONFIG
    },
    qrcode: {
        visibility: document.querySelectorAll(".qr-code-svg, .link-sensor, .generate-qrcode, .revoke-qrcode"),
        performOnElements: [{
            elements: document.querySelectorAll(".link-sensor"),
            onSelect: (element: Element) => {
                if (element.getAttribute("href") == "") {
                    hide(element);
                }
            }
        }, {
            elements: document.querySelectorAll(".generate-qrcode"),
            onSelect: (element => {
                if (hasURL(element.parentElement!)) {
                    hide(element);
                }
            })
        }, {
            elements: document.querySelectorAll(".revoke-qrcode"),
            onSelect: (element => {
                if (!hasURL(element.parentElement!)) {
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
        visibility: document.querySelectorAll(".qr-code-svg"),
        performOnElements: [{
            elements: document.querySelectorAll(".qr-container"),
            onSelect: (element) => {
                if (!hasURL(element)) {
                    hide(element);
                }
                element.classList.add("clickable")
                if (selected.includes(element)) {
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
}

for (let tab of document.getElementsByClassName("select-page")) {
    tab.addEventListener("click", async (event) => {
        const nextId = tab.id.split("select-")[1];
        for (let [key, value] of Object.entries(dynamic)) {
            if (key !== nextId) {
                if (value.onQuit != null) {
                    await value.onQuit();
                }
                value.visibility.forEach(hide);
                value.performOnElements?.forEach(elements => {
                    if (elements.onQuit != null) {
                        elements.elements.forEach(element => elements.onQuit!(element));
                    }
                });
            }
        }
        const next = dynamic[nextId];
        if (next.onSelect != null) {
            await next.onSelect();
        }
        next.visibility.forEach(show);
        next.performOnElements?.forEach(elements => {
            if (elements.onSelect != null) {
                elements.elements.forEach(element => elements.onSelect!(element));
            }
        });
    })
}

function hasURL(qrContainer: Element): boolean {
    return qrContainer.querySelector(".link-sensor")?.getAttribute("href") != ""
}

async function loadQrCodes() {
    if (!loadedQRCodes) {
        loadedQRCodes = true;
        const res = await fetch("./config/get-qrcodes", {
            method: "GET"
        });
        let qrCodes: { [id: string]: { qrcode: string, link: string } } = await res.json();
        for (let [key, value] of Object.entries(qrCodes)) {
            const div = document.getElementById(key)!;
            (div.querySelector(".qr-code-svg")! as HTMLImageElement).src = value.qrcode;
            (div.querySelector(".link-sensor")! as HTMLLinkElement).href = value.link;
        }
    }
}

for (let container of document.getElementsByClassName("qr-container")) {
    container.addEventListener("click", (event) => {
        if (mode != Mode.PRINT) {
            return;
        }
        if (container.classList.contains("selected")) {
            container.classList.remove("selected");
            selected.splice(selected.indexOf(container), 1)
        } else {
            container.classList.add("selected")
            selected.push(container)
        }
    })
}

for (let generate of document.getElementsByClassName("generate-qrcode")) {
    generate.addEventListener("click", () => {
        const sensor = generate.parentElement!;
        fetch("./config/generate", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({sensor: sensor.id})
        }).then(async (res) => {
            let qrCode: { qrcode: string, link: string } = await res.json();
            const image: HTMLImageElement = sensor.querySelector(".qr-code-svg")!;
            image.src = qrCode.qrcode;
            const link: HTMLLinkElement = sensor.querySelector(".link-sensor")!;
            link.href = qrCode.link;
            show(image);
            show(link);
            hide(sensor.querySelector(".generate-qrcode")!)
            show(sensor.querySelector(".revoke-qrcode")!)
        })
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
    modalTitle.textContent = `Confirmer la révocation (${selectionRevoke.parentElement!.id})`;
}

window.onclick = function (event) {
    if (event.target == modal) {
        closeConfirm();
    }
}

let selectionRevoke: HTMLElement;
for (let revoke of document.getElementsByClassName("revoke-qrcode")) {
    revoke.addEventListener("click", async () => {
        selectionRevoke = revoke as HTMLElement;
        openConfirm();
    });
}

document.getElementById("cancel-revoke-button")!.addEventListener("click", closeConfirm);
document.getElementById("confirm-revoke-button")!.addEventListener("click", async event => {
    const sensor = selectionRevoke.parentElement!;
    await fetch("./config/revoke", {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({sensor: sensor.id})
    });
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