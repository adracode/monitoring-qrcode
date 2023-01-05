const request = document.getElementById('get-request');
const response = document.getElementById('influx-response');

request!.addEventListener('click', () => {
    fetch('/capteur/teqsfdqsdfqdsfst', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            response!.textContent = JSON.stringify(data, undefined, 2);
        })
        .catch(error => console.error(error));
});
