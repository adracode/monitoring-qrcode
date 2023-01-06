const request = document.getElementById('get-request');
const response = document.getElementById('influx-response');

request!.addEventListener('click', () => {
    fetch('/capteur/teqsfdqsdfqdsfst', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(data => {
            alert(data.body);
        })
        .catch(error => console.error(error));
});
