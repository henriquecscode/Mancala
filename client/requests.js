var server = ""
var logged = false;
var gameID = "";
var evtSrc;

window.addEventListener('load', () => {
    addEventListeners();
})

function addEventListeners() {
    document.getElementById("leaderboard-button").addEventListener('click', leaderboard);
    document.getElementById("register-button").addEventListener('click', () => { serverRegister('register'); });
    document.getElementById("login-button").addEventListener('click', () => { serverRegister('login'); });
}

async function leaderboard() {
    let url = server + '/ranking';

    let request = fetch(url, {
        method: 'POST',
        body: JSON.stringify({})
    });
    let response = await request;
    let responseJSON = await response.json();
    let ranking = responseJSON.ranking;

    let table = document.getElementById("leaderboard").children[1];
    while (table.children.length > 0) {
        table.removeChild(table.lastChild);
    }
    for (let rank of ranking) {
        let tr = document.createElement("tr");
        tr.setAttribute('class', '');
        let nickEle = document.createElement("td");
        nickEle.setAttribute('class', '');
        nickEle.innerHTML = rank.nick;
        let victoriesEle = document.createElement("td");
        victoriesEle.setAttribute('class', '');
        victoriesEle.innerHTML = rank.victories;
        let gamesEle = document.createElement("td");
        gamesEle.setAttribute('class', '');
        gamesEle.innerHTML = rank.games;
        tr.appendChild(nickEle);
        tr.appendChild(victoriesEle);
        tr.appendChild(gamesEle);
        table.appendChild(tr);
    }
}

async function serverRegister(name) {
    let url = server + '/register';
    let nameEle = document.querySelector("[name='" + name + "-username']");
    let passEle = document.querySelector("[name='" + name + "-password']");
    let nickname = nameEle.value;
    let password = passEle.value;

    if (nickname == "" || password == "") {
        return;
    }

    let registerData = {
        nick: nickname,
        password: password
    }

    let request = fetch(url, {
        method: 'POST',
        body: JSON.stringify(registerData)
    });
    let response = await request;
    let responseJSON = await response.json();
    if (responseJSON.error != null) {
        validateAuth(false);
        // alert("Failed authentication");
        return;
    }
    validateAuth(true);
    hideAuthPanel();
    logged = true;
    window.location.href = '#';

}

function hideAuthPanel(hide = true) {
    let auths = document.querySelectorAll("a.authentication-popup");
    for (let auth of auths) {
        if (hide) {
            auth.classList.add('button-selected')
        }
        else {
            auth.classList.remove('button-selected');
        }
    }

    fillInfo(hide);
}

function validateAuth(success) {
    let loginErrors = document.querySelectorAll('div.login-error');
    for (let loginError of loginErrors) {
        loginError.style.display = success ? 'none' : 'block';
    }

}
function fillInfo(hide) {
    let [nickname, password] = getLoginInfo();
    let name = "login";
    let nameEle = document.querySelector("[name='" + name + "-username']");
    let passEle = document.querySelector("[name='" + name + "-password']");

    if (hide) {
        nameEle.value = nickname;
        passEle.value = password;
    }
    else {
        nameEle.value = "";
        passEle.value = "";
    }

    name = "register"
    nameEle = document.querySelector("[name='" + name + "-username']");
    passEle = document.querySelector("[name='" + name + "-password']");
    if (hide) {
        nameEle.value = nickname;
        passEle.value = password;
    }
    else {
        nameEle.value = "";
        passEle.value = "";
    }

}

export function getLoginInfo() {
    let name = "login"
    let nameEle = document.querySelector("[name='" + name + "-username']");
    let passEle = document.querySelector("[name='" + name + "-password']");
    let nickname = nameEle.value;
    let password = passEle.value;

    if (nickname == "" || password == "") {
        let name = "register"
        nameEle = document.querySelector("[name='" + name + "-username']");
        passEle = document.querySelector("[name='" + name + "-password']");
        nickname = nameEle.value;
        password = passEle.value;
    }
    return [nickname, password];
}

export async function join(game) {
    let group = 81;
    let noPitsEle = document.querySelector("input[name='no-pits']");
    let noSeedsEle = document.querySelector("input[name='no-seeds']");

    let noPits = noPitsEle.value;
    let noSeeds = noSeedsEle.value;

    if (!logged) {
        showMessage('Must first be logged in');
        return false;
    }
    let [nickname, password] = getLoginInfo();

    if (nickname == "" || password == "") {
        showMessage('Must first be logged in');
        return false;
    }

    let joinData = {
        group: group,
        nick: nickname,
        password: password,
        size: noPits,
        initial: noSeeds
    }

    let url = server + '/join';
    let request = fetch(url, {
        method: 'POST',
        body: JSON.stringify(joinData)
    });
    let response = await request;
    let responseJSON = await response.json();
    if (responseJSON.error != null) {
        showMessage("Couldn't join game." + responseJSON.error);
        return false;
    }
    gameID = responseJSON.game;
    showMessage("Joined a new game. Playing as " + nickname);
    addEventSource(game, nickname);
    return true;

}

function updateEvent(game) {
    const data = JSON.parse(this.data);
    game.updateState(data);

}

function updateErrorEvent(event) {
    const data = JSON.parse(event.data);
    showMessage("An unexpected error has occured");
}

function addEventSource(game, nickname) {
    // https://developer.mozilla.org/pt-BR/docs/Web/API/Server-sent_events/Using_server-sent_events
    let url = server + "/update" + "?game=" + gameID + "&nick=" + nickname;
    evtSrc = new EventSource(url);
    evtSrc.onmessage = (e) => { updateEvent.call(e, game); }
    evtSrc.onerror = updateErrorEvent;
}

export function closeEventSource() {
    evtSrc.close();
}


export async function leave() {
    if (gameID == "") {
        showMessage("No game to leave. Playing no game yet");
    }

    if (!logged) {
        showMessage('Must first be logged in');
        return;
    }
    let [nickname, password] = getLoginInfo();

    if (nickname == "" || password == "") {
        showMessage('Must first be logged in');
    }

    let leaveData = {
        nick: nickname,
        password: password,
        game: gameID
    }

    let url = server + '/leave';
    let request = fetch(url, {
        method: 'POST',
        body: JSON.stringify(leaveData)
    });
    let response = await request;
    let responseJSON = await response.json();
    if (responseJSON.error != null) {
        showMessage("Couldn't leave the game. " + responseJSON.error);;
        return;
    }
    showMessage("Left the game you were playing");
    closeEventSource();
}

export async function notify(move) {

    let [nickname, password] = getLoginInfo();

    let notifyData = {
        nick: nickname,
        password: password,
        game: gameID,
        move: move
    }

    let url = server + '/notify';
    let request = fetch(url, {
        method: 'POST',
        body: JSON.stringify(notifyData)
    });
    let response = await request;
    let responseJSON = await response.json();
    if (responseJSON.error != null) {
        showMessage("Failed notify move." + responseJSON.error);
        return;
    }

}

export function showMessage(message) {
    let div = document.getElementById('game-messages');
    div.innerHTML = message;
}