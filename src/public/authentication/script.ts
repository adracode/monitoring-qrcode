

const form = document.getElementById("login-form")!;
const message = document.getElementById("message")!;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.getElementById("password")as HTMLInputElement;
  let data = {password: password.value}
  try {
    const response = await fetch('./admin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    switch(response.status){
        case 200:
            let responseData = await response.json();
            let authToken = responseData.authToken;
            message.textContent = "Vous êtes connecté.";
            // Stockage du cookie d'authentification
            window.localStorage.setItem('authToken', authToken);
            window.location.replace("/qrcode/config");
            break;
        case 401:
            message.textContent = "Mot de passe incorrect";
            break;
        case 500:
            message.textContent = "Aucun mot de passe connu. Contactez votre administrateur.";
            break;
        default:
            message.textContent = `Erreur ${response.status}`;
    }
  } catch (error) {
    console.error(error);
    message.textContent = "Une erreur s'est produite";
  }
});