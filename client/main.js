import { Game } from './game.js'
import { join, leave, showMessage } from './requests.js'

var game = new Game();
window.addEventListener('load', () => {
    //
})

window.onresize = () => {
    game.resizePits();
}

async function startGame() {
    let configs = getConfigs();
    let loggedInGame;
    if (!configs.isAi) {
        loggedInGame = await join(game);
    }
    else {
        loggedInGame = true;
    }
    if (!loggedInGame) {
        return;
    }
    game.createGame(configs);
}

async function leaveGame() {
    if (!game.getAI()) {
        await leave();
    }
    else{
        showMessage("AI won. Press play to restart");
    }
}

function getConfigs() {
    let configs = {};
    configs.noPits = parseInt(document.getElementsByName("no-pits")[0].value);
    configs.noSeeds = parseInt(document.getElementsByName("no-seeds")[0].value);
    configs.isAi = document.querySelector('input[name="sp-mp"]:checked').value == "single";
    configs.isBotPlayer = document.querySelector('input[name="starter"]:checked').value == "p1";
    configs.difficulty = parseInt(document.querySelector('input[name="diff"]:checked').value)

    return configs;
}

document.getElementById("play-button").addEventListener("click", startGame);
document.getElementById('leave-button').addEventListener('click', leaveGame);
