{
    const message = document.getElementById('message')! as HTMLLabelElement;
    const inputs = document.getElementsByClassName('password-input')! as HTMLCollectionOf<HTMLInputElement>;

    
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
            switch (response.status) {
                case 200:
                    password.classList.add('valid');
                    confirmPassword.classList.add('valid');
                    message.classList.add('valid');
                    message.innerText = 'Mot de passe modifié.';
                    message.classList.remove('hidden');
                    setTimeout(() => window.location.replace('/login'), 1000);
                    break;
                default:
                    let responseData = await response.json();
                    password.classList.add('invalid');
                    confirmPassword.classList.add('invalid');
                    message.innerText = `${responseData.message??response.statusText}`;
                    message.classList.remove('hidden');
            }
        } catch (error) {
            console.error(error);
            password.classList.add('invalid');
            confirmPassword.classList.add('invalid');
            message.innerText = "Une erreur s'est produite";
            message.classList.remove('hidden');
        }
    });

    for(let input of inputs){
        input.addEventListener('focus', event => {
            inputs[0].classList.remove('invalid');
            inputs[1].classList.remove('invalid');
            message.innerText = "Message d'erreur";
            message.classList.add('hidden');
        });
        
        input.addEventListener('input', event => {
            inputs[0].classList.remove('invalid');
            inputs[1].classList.remove('invalid');
            message.innerText = "Message d'erreur";
            message.classList.add('hidden');
        });
    }
}
