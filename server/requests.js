const http = require('http');
const crypto = require('crypto');
const { loadUsers, saveUsers } = require('./data');
const { Game } = require('./game');

let users = {}; // {nick: {hash, game, res, stats: {games, victories}}}
let lobbies = {}; // {(size, initial): {hash, first, timestamp}}
let games = {}; //{game: {first, second, game}}
const timeoutSave = 60;
let automaticSave;

module.exports.initialize = function () {
    users = loadUsers();
    automaticSave = setInterval(() => { saveUsers(users) }, timeoutSave * 1000);
}


module.exports.registerReq = function (res, data) {
    let login = attemptLogin(data);
    if (login) {
        goodRequest(res);
    }
    else {
        badLoginRequest(res);
    }
}

module.exports.joinReq = function (res, data) {
    let login = attemptLogin(data);
    if (!login) {
        badLoginRequest(res);
        return;
    }

    if (users[data.nick].game != null) {
        // Already in a game. Let's opt to return in
        badRequest(res, "Already in a game");
        // res.writeHead(400);
        // res.end(JSON.stringify({ game: users[data.nick].game }));
        return;
    }

    let hash, lobby;
    let key = [data.size, data.initial];
    if (!(key in lobbies)) {
        lobby = createNewLobby(data);
        lobbies[key] = lobby;
        hash = lobby.hash;
    }
    else {
        lobby = lobbies[key];
        hash = lobby.hash;
        lobby.second = data.nick;

        let game = createnewGame(lobby);
        games[lobby.hash] = game;

        delete lobbies[key];
    }
    users[data.nick].game = hash;
    res.writeHead(200);
    res.end(JSON.stringify({ game: hash }));
}

module.exports.setEventSrc = function (req, res, query) {
    req.on('close', () => {
        delete users[query.nick].res;
    });
    if (checkPlayerGame(query.nick, query.game)) {
        // All good
        users[query.nick].res = res;
        firstNotification(res);

    }
    else {
        badGameReference(res);
    }

    if (query.game in games) {
        let game = games[query.game];
        // We are ensuring that both players have indeed set up their event sources
        for (let player of game.getPlayers()) {
            if (users[player].res == undefined) {
                return;
            }
        }
        // Game has started, this is the second request for event src
        notifyGameState(game);
    } else {
    }
}

module.exports.notifyReq = function (res, data) {
    let login = attemptLogin(data);
    if (!login) {
        badLoginRequest(res);
        return;
    }
    if (!checkPlayerGame(data.nick, data.game)) {
        badGameReference(res);
        return;
    }

    let game = games[data.game]

    if (!('move' in data)) {
        badRequest(res, "no move");
        return;
    }
    if (!game.checkPlayerMove(data.nick)) {
        badRequest(res, "Not your turn to play");
        return;
    }
    let number = parseInt(data.move);
    if (isNaN(number)) {
        invalidMove(res);
        return;
    }
    if (number < 0) {
        invalidMove(res);
        return;
    }
    if (number >= game.getNoPits()) {
        invalidMove(res);
        return;
    }

    game.playPlayerPit(data.nick, number);
    notifyGameState(game);

    goodRequest(res);
}

function attemptLogin(data) {

    if (!('nick' in data) || !('password' in data)) {
        return false; //wont return 400 but rather 401
    }

    const hash = crypto
        .createHash('md5')
        .update(data.password)
        .digest('hex');
    if (!(data.nick in users)) {
        users[data.nick] = { pass_plain: data.password, pass: hash, game: null, stats: { games: 0, victories: 0 } };
        saveUsers(users);
        return true;
    }
    else {
        if (users[data.nick].pass != hash) {
            // Log in failure
            return false;
        }
        else {
            return true;
        }
    }
}

module.exports.leaveReq = function (res, data) {
    let login = attemptLogin(data);
    if (!login) {
        badLoginRequest(res);
        return;
    }


    let game = data.game;
    // Is the player in that game?
    if (users[data.nick].game != game) {
        badRequest(res, "Not currently in that game");
        return;
    }

    // Is it a lobby?
    let key = Object.keys(lobbies).find(key => lobbies[key].hash == game);
    if (key != undefined) {
        delete lobbies[key];
        delete users[data.nick].game;
        res.writeHead(200);
        res.end(JSON.stringify({ winner: null }));
        return;
    }

    // Is it a game?
    if (game in games) {
        let hash = game;
        game = games[hash];
        let players = game.getPlayers();
        let winner = (data.nick == players[0]) ? players[1] : players[0];
        let loser = (data.nick == players[0]) ? players[0] : players[1];

        users[loser].stats.games++;
        users[winner].stats.games++;
        users[winner].stats.victories++;


        let sendData = `data: ${JSON.stringify({ winner: winner })}\n\n`
        notifyPlayers(players, sendData);

        users[winner].res.end(JSON.stringify({}));
        users[loser].res.end(JSON.stringify({}));
        delete users[winner].res;
        delete users[winner].game;
        delete users[loser].res;
        delete users[loser].game;

        res.writeHead(200);
        res.end(JSON.stringify({}));
    }
    else {
        badRequest(res, "The game you're looking for does not exist");
    }
}

module.exports.rankingReq = function (res) {

    let ranks = getLeaderboard();
    res.writeHead(200);
    res.end(JSON.stringify({ ranking: ranks }));
}

function createNewLobby(data) {
    let time = Date.now().toString();
    const hash = crypto
        .createHash('md5')
        .update(time) //Based on the time
        .update(data.size)
        .update(data.initial)
        .digest('hex');

    let lobby = {
        hash: hash,
        first: data.nick,
        timestamp: time,
        size: parseInt(data.size),
        initial: parseInt(data.initial)
    };
    return lobby;
}

function createnewGame(lobby) {
    let size = lobby.size
    let initial = lobby.initial

    let data = {
        noPits: size,
        noSeeds: initial,
        first: lobby.first,
        second: lobby.second
    }
    let game = new Game(data);
    return game;
}

function goodRequest(res) {
    res.writeHead(200);
    res.end(JSON.stringify({}));
}
function badRequest(res, error) {
    res.writeHead(400, "Bad Request");
    res.end(JSON.stringify({ error: error }));
}
function invalidMove(res) {
    badRequest(res, "Invalid move");
}
function badGameReference(res) {
    badRequest(res, "Invalid game reference");
}
function badLoginRequest(res) {
    res.writeHead(401, "Failed authentication");
    res.end(JSON.stringify({ error: "User registered with a different password" }));
}

function checkPlayerGame(nick, game) {
    if (!(nick in users)) {
        return false;
    }
    return users[nick].game == game;
}

function notifyGameState(game) {
    let players = game.getPlayers();
    let gameState = game.getGameState();
    let data = `data: ${JSON.stringify(gameState)}\n\n`;
    notifyPlayers(players, data);
}

function firstNotification(res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
}

function notifyPlayers(players, data) {
    for (player of players) {
        let res = users[player].res;
        res.write(data);
    }
}

// Debugging
function sleep(miliseconds) {
    var currentTime = new Date().getTime();

    while (currentTime + miliseconds >= new Date().getTime()) {
    }
}

function getLeaderboard() {

    let players = Object.entries(users);
    players = players.map(([key, value]) => {
        let ranker = {};
        ranker.nick = key,
            ranker.victories = value.stats.victories;
        ranker.games = value.stats.games;
        return ranker;
    })
    let ranks = players.sort((a, b) => {
        let aGames = a.games;
        let aVictories = a.victories;

        let bGames = b.games;
        let bVictories = b.victories;

        if (aVictories > bVictories) {
            return -1;
        }
        else if (aVictories < bVictories) {
            return 1;
        }
        else {
            if (aGames < bGames) {
                return -1;
            }
            else if (aGames > bGames) {
                return 1;
            }
            return 0;
        }

    })
    ranks = ranks.slice(0, 10);
    return ranks;
}