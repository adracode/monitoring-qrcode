const form = document.getElementById("login-form")!;
const message = document.getElementById("message")!;
const input = document.getElementsByClassName("password-input")![0] as HTMLInputElement;

form.addEventListener("submit", async (event) => {
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
        let responseData = await response.json();
        let authToken = responseData.authToken;
        input.classList.add("valid");
        message.classList.add("valid");
        message.innerText = "Vous êtes connecté.";
        message.classList.remove("hidden");
        // Stockage du cookie d'authentification
        window.localStorage.setItem('authToken', authToken);
        window.location.replace("/config");
        break;
      case 401:
        input.classList.add("invalid");
        message.innerText = "Mot de passe incorrect";
        message.classList.remove("hidden");
        break;
      case 500:
        input.classList.add("invalid");
        message.innerText = "Aucun mot de passe connu.\nContactez votre administrateur.";
        message.classList.remove("hidden");
        break;
      default:
        input.classList.add("invalid");
        message.innerText = `Erreur ${response.status}`;
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