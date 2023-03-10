
const { changePasswordFromExternal } = require("./services/password");
var readline = require('readline');
const ac = new AbortController();
const signal = ac.signal;

const abortTime = 30 * 1000;

const Writable = require('stream').Writable;

const mutableStdout = new Writable({
    write: function (chunk: any, encoding: any, callback: any) {
        if (!this.muted)
            process.stdout.write(chunk, encoding);
        callback();
    }
});


const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true
});


function changePassword(password: string) {
    if (changePasswordFromExternal(password)) {
        console.log(`Mot de passe modifié`);
    } else {
        console.log("Impossible de modifié le mot de passe");
    }
}

function getPassword(prompt: string) {
    return new Promise<string>(resolve => {
        rl.question(prompt, { signal }, (password: string) => {
            resolve(password == "" ? "admin": password);
        });
    });
}

async function main() {
    console.log("Changment du mot de passe administrateur.\nPar défaut le mot de passe est admin");
    console.log("Nouveau mot de passe: ");
    mutableStdout.muted = true;
    const password: string = (await getPassword('Nouveau mot de passe: '));
    console.log("\nConfirmez le mot de passe: ")
    const confirmPassword: string = (await getPassword('Confirmez le mot de passe: '));
    rl.close();
    if (password === confirmPassword) {
        console.log('\nMots de passes identiques\nModification en cours');
        changePassword(password);
    } else {
        console.log('\nMots de passes différents. Veuillez réessayer');
    }
    clearTimeout(timer);
}


signal.addEventListener('abort', () => {
    console.log('\nDélai de modification expiré');
    rl.close();
}, { once: true });

let timer = setTimeout(() => ac.abort(), abortTime);
main();
