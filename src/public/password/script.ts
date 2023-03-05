{
  const form = document.getElementById("login-form")!;

  const message = document.getElementById("message")!;
  const input = document.getElementsByClassName("password-input")![0] as HTMLInputElement;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.getElementById("password") as HTMLInputElement;
    let data = {password: password.value}
    try {
      const response = await fetch('/password', {
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
          message.innerText = "Mot de passe modifié.";
          message.classList.remove("hidden");
          break;
        default:
          input.classList.add("invalid");
          message.innerText = `Erreur ${response}`;
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
    if (input.classList.contains("invalid")) {
      input.classList.remove("invalid");
      message.innerText = "Message d'erreur";
      message.classList.add("hidden");
    }
  });
}