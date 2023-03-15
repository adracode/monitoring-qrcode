enum Mode {
    CONFIG,
    QRCODES,
    PRINT,
    LABEL,
    SETTINGS
}

let mode = Mode.CONFIG;
let loadedQRCodes = false;
let selected: Element[] = [];
let labelsValue: { [id: string]: string | null } = {};

const modalTitle = document.getElementById("confirm-revocation-title")!;
const modal = document.getElementById("confirm-revoke")!;
const errorMessage = document.getElementById('message')! as HTMLLabelElement;
const passwordInputs = document.getElementsByClassName('password-input')! as HTMLCollectionOf<HTMLInputElement>;
let selectionRevoke: HTMLElement;

const tabs: {
    [id: string]: {
        elements: NodeListOf<Element>,
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
        elements: document.querySelectorAll("#qrcodes, .config-data-type, .edit-text.for-qrcode"),
        onSelect: () => mode = Mode.CONFIG
    },
    qrcode: {
        elements: document.querySelectorAll("#qrcodes, .qr-code-svg, .link-sensor, .generate-qrcode, .revoke-qrcode"),
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
        elements: document.querySelectorAll("#qrcodes, .qr-code-svg, .print-qrcodes"),
        performOnElements: [{
            elements: document.querySelectorAll(".box"),
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
        elements: document.querySelectorAll("#labels"),
        onSelect: () => mode = Mode.LABEL
    },
    settings: {
        elements: document.querySelectorAll("#settings"),
        onSelect: () => mode = Mode.SETTINGS
    }
}

/**
 * Cacher un élément.
 * @param element
 */
function hide(element: Element) {
    element.classList.add("hidden");
}

/**
 * Rendre visible un élément caché
 * @param element
 */
function show(element: Element) {
    element.classList.remove("hidden");
}

/**
 * Vérifier que l'élément à un lien valide.
 * @param element
 */
function hasURL(element: Element): boolean {
    return element.querySelector(".link-sensor")?.getAttribute("href") != ""
}

/**
 * Ouvrir la fenêtre de confirmation.
 */
function openConfirm() {
    modal.style.display = "flex";
    selectionRevoke.classList.add("hover");
    modalTitle.textContent = `Confirmer la révocation: ${selectionRevoke.parentElement!.id}`;
}

/**
 * Fermer la fenêtre de confirmation.
 */
function closeConfirm() {
    modal.style.display = "none";
    selectionRevoke.classList.remove("hover");
}

/**
 * Charger et afficher les QRCodes disponibles.
 */
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

/**
 * Construire la page d'impression des QRCodes.
 * @param qrcodes
 */
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

/**
 * Comportement lors du clic sur un onglet
 * @param tab
 */
async function clickOnTab(tab: Element){
    const nextId = tab.id.split("select-")[1];
    for(let [key, value] of Object.entries(tabs)) {
        if(key !== nextId) {
            if(value.onQuit != null) {
                await value.onQuit();
            }
            value.elements.forEach(hide);
            value.performOnElements?.forEach(elements => {
                if(elements.onQuit != null) {
                    elements.elements.forEach(element => elements.onQuit!(element));
                }
            });
        }
    }
    const next = tabs[nextId];
    if(next.onSelect != null) {
        await next.onSelect();
    }
    next.elements.forEach(show);
    next.performOnElements?.forEach(elements => {
        if(elements.onSelect != null) {
            elements.elements.forEach(element => elements.onSelect!(element));
        }
    })}

/**
 * Affichage des différents onglets.
 */
for(let tab of document.querySelectorAll(".select-page")) {
    tab.addEventListener("click", async () => {;
        clickOnTab(tab);
    })
}

/**
 * Gèrer la sélection des types de données.
 */
for(let setType of document.querySelectorAll(".set-data-type")) {
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
                display: checkBox.checked
            }),
        });
        (setType as HTMLInputElement).disabled = false;
    })
}

/**
 * Sélectionner les QRCodes à imprimer.
 */
for(let container of document.querySelectorAll(".box")) {
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

/**
 * Générer les QRCodes.
 */
for(let generate of document.querySelectorAll(".generate-qrcode")) {
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

/**
 * Ouvrir la fenêtre de confirmation.
 */
for(let revoke of document.querySelectorAll(".revoke-qrcode")) {
    revoke.addEventListener("click", async () => {
        selectionRevoke = revoke as HTMLElement;
        openConfirm();
    });
}

/**
 * Gérer la modification des labels.
 */
for(let input of document.querySelectorAll(".change-label")) {
    labelsValue[input.id] = input.textContent;
    input.addEventListener("keydown", event => {
        if((event as KeyboardEvent).key === "Enter") {
            event.preventDefault()
        }
    });
    input.addEventListener("input", () => {
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

/**
 * Gérer la modification des labels des capteurs.
 */
for(let changeLabel of document.querySelectorAll(".edit-text.for-qrcode > .change-label")) {
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

/**
 * Gérer la modification des labels des types de données.
 */
for(let changeLabel of document.querySelectorAll(".edit-text.for-type > .change-label")) {
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

/**
 * Gérer la déconnexion.
 */
for(let disconnect of document.querySelectorAll(".disconnect-button")) {
    disconnect.addEventListener("click", async (event) => {
        let res = await fetch("./disconnect", {
            method: "POST"
        });
        window.location.href = res.url;
    });
}

/**
 * Imprimer les QRCodes.
 */
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

/**
 * Gérer la confirmation de révocation.
 */
document.querySelector("#cancel-revoke-button")!.addEventListener("click", closeConfirm);
document.querySelector("#confirm-revoke-button")!.addEventListener("click", async event => {
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

document.getElementById('edit-password-form')!.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('new-password')! as HTMLInputElement;
    const confirmPassword = document.getElementById('confirm-password')! as HTMLInputElement;
    const data = { password: password.value, confirmPassword: confirmPassword.value };
    try {
        const response = await fetch('/password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        switch(response.status) {
            case 200:
                password.classList.add('valid');
                confirmPassword.classList.add('valid');
                errorMessage.classList.add('valid');
                errorMessage.innerText = 'Mot de passe modifié.';
                errorMessage.classList.remove('hidden');
                setTimeout(() => window.location.replace('/login'), 1000);
                break;
            default:
                let responseData = await response.json();
                password.classList.add('invalid');
                confirmPassword.classList.add('invalid');
                errorMessage.innerText = `${responseData.message ?? response.statusText}`;
                errorMessage.classList.remove('hidden');
        }
    } catch(error) {
        console.error(error);
        password.classList.add('invalid');
        confirmPassword.classList.add('invalid');
        errorMessage.innerText = "Une erreur s'est produite";
        errorMessage.classList.remove('hidden');
    }
});
for(let input of passwordInputs) {
    input.addEventListener('focus', event => {
        passwordInputs[0].classList.remove('invalid');
        passwordInputs[1].classList.remove('invalid');
        errorMessage.innerText = "Message d'erreur";
        errorMessage.classList.add('hidden');
    });

    input.addEventListener('input', event => {
        passwordInputs[0].classList.remove('invalid');
        passwordInputs[1].classList.remove('invalid');
        errorMessage.innerText = "Message d'erreur";
        errorMessage.classList.add('hidden');
    });
}

/**
 * Gérer la modification des paramètres.
 */
for(let changeLabel of document.querySelectorAll(".edit-text.for-setting > .change-label")) {
    changeLabel.addEventListener("keydown", async (event) => {
        if((event as KeyboardEvent).key === "Enter") {
            if(mode != Mode.SETTINGS || !changeLabel.classList.contains("modified")) {
                return;
            }
            const input = event.target as HTMLInputElement;
            if(input == null || input.value === ""){
                return;
            }
            const identifier = input.id.split("setting-")[1]
            input.classList.remove("modified")
            const response = await fetch("./setting", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: identifier,
                    value: input.value
                }),
            });
            if(response.status != 200){
                input.value = labelsValue[input.id]!;
                input.classList.add("modified");
                return;
            }
            input.value = (await response.json()).value;
            labelsValue[input.id] = input.value;
            input.classList.add("validated");
        }
    });
}

/**
 * Fermer la fenêtre de confirmation.
 * @param event
 */
window.onclick = function(event) {
    if(event.target == modal) {
        closeConfirm();
    }
}

/**
 * Chargement de la première page
 */
clickOnTab(document.querySelector('#select-qrcode')!);