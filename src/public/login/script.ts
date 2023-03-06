{
    const message = document.getElementById("message")!;
    const input = document.getElementsByClassName("password-input")![0] as HTMLInputElement;

    document.getElementById("login-form")!.addEventListener("submit", async (event) => {
        event.preventDefault();
        const password = document.getElementById("password") as HTMLInputElement;
        let data = { password: password.value }
        try {
            const response = await fetch('./', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            switch (response.status) {
                case 200:
                    input.classList.add("valid");
                    message.classList.add("valid");
                    message.innerText = "Vous êtes connecté.";
                    message.classList.remove("hidden");
                    setTimeout(() => window.location.replace("/config"), 1000);
                    break;
                default:
                    let responseData = await response.json();
                    input.classList.add("invalid");
                    message.innerText = `${responseData.message??response.statusText}`;
                    message.classList.remove("hidden");
            }
        } catch (error) {
            console.error(error);
            input.classList.add("invalid");
            message.innerText = "Une erreur s'est produite";
            message.classList.remove("hidden");
        }
    });


    input.addEventListener("focus", event => {
        input.classList.remove("invalid");
        message.innerText = "Message d'erreur";
        message.classList.add("hidden");
    });
    input.addEventListener("input", (event) => {
        input.classList.remove("invalid");
        message.innerText = "Message d'erreur";
        message.classList.add("hidden");
    });
}