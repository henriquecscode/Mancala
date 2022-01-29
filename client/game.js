import { Board } from './board.js';
import { Player, PlayerAI } from './player.js'
import { leave, notify, getLoginInfo, closeEventSource, showMessage } from './requests.js'


const pitWrapperName = "game-board-pit-wrapper";
const pitName = "game-board-pit";
const seedName = "game-board-seed";
const storageWrapperClassName = "game-board-storage-wrapper";
const storageClassName = 'game-board-storage';
const rowName = "game-board-pits-row";

export class Game {

    timeoutTime = 120;
    isAi = false;
    constructor() { }

    createGame(configs) {
        this.noPits = configs.noPits;
        this.noSeeds = configs.noSeeds;
        this.isAi = configs.isAi;
        this.isBotPlayer = configs.isBotPlayer;
        this.difficulty = configs.difficulty;
        this.createData();
        this.createBoard();

    }

    createData() {
        this.player1 = new Player()
        if (this.isAi) {
            this.player2 = new PlayerAI(this.difficulty);
            this.startGame = true;
        }
        else {
            this.startGame = false;
        }
        this.board = new Board(this.noPits, this.noSeeds);
        this.endGame = false;
    }

    createBoard() {
        this.removeBoard();
        this.createPits();
        this.resizePits();
        //Create game-board-pit-wrapper and game-board-pit. These should remain unaltered
        this.pitsEventListener();
        this.printBoard(); //Put content inside the game-board-pit
    }

    createTimeout() {
        this.timeout = setTimeout(this.gameTimedOut, 1000 * this.timeoutTime);
    }

    resetTimeout() {
        clearTimeout(this.timeout);
        this.createTimeout();
    }

    gameTimedOut() {
        this.endGame = true;
        leave();
    }

    getAI() {
        return this.isAi;
    }

    removeBoard() {

        // Remove pits
        let rowName = "game-board-pits-row";
        let row;
        for (let i = 0; i < 2; i++) {
            row = document.getElementById(rowName + '-' + i);

            while (row.firstChild) {
                row.removeChild(row.firstChild);
            }
        }

        // Remove storages to get rid of the event handlers
        let storage;
        let gameBoard = document.getElementById('game-board');
        gameBoard.removeChild(gameBoard.firstElementChild);
        gameBoard.removeChild(gameBoard.lastElementChild);
        gameBoard.appendChild(this.createOneStorage());
        gameBoard.insertBefore(this.createOneStorage(), gameBoard.firstChild);
        // The empty space in the html file count as a child, hence the removal using elementchild. inserting can get before the text, hence just firstchild
    }

    createPits() {
        for (let i = 0; i < 2; i++) {
            let row = document.getElementById(rowName + '-' + i);
            for (let j = 0; j < this.noPits; j++) {
                let index = (((this.noPits + 1) * i) + j);
                let pitToAdd = this.createOnePit(index);

                if (i == 0) {
                    row.insertBefore(pitToAdd, row.firstChild);
                }
                else {
                    row.appendChild(pitToAdd);
                }
            }
        }
        let storages = document.getElementsByClassName('game-board-storage');
        storages[0].setAttribute('id', pitName + '-' + this.noPits);
        storages[1].setAttribute('id', pitName + '-' + (2 * this.noPits + 1));

    }

    createOneStorage() {
        let storageWrapper = document.createElement('div');
        storageWrapper.setAttribute('class', storageWrapperClassName);
        let storage = document.createElement('div');
        storage.setAttribute('class', storageClassName);
        storageWrapper.appendChild(storage);
        return storageWrapper;
    }

    createOnePit(index) {
        let pitWrapper = document.createElement('div');
        pitWrapper.setAttribute('class', pitWrapperName);
        pitWrapper.setAttribute('id', pitWrapperName + '-' + index);
        let pit = document.createElement('div');
        pit.setAttribute('class', pitName);
        pit.setAttribute('id', pitName + '-' + index);
        pitWrapper.appendChild(pit);
        return pitWrapper;
    }

    createOneSeed() {
        let seed = document.createElement('div');
        seed.setAttribute('class', seedName);
        return seed;
    }

    printBoard() {

        // Pits and storages
        for (let i = 0; i < this.noPits * 2 + 2; i++) {
            let pit = document.getElementById(pitName + '-' + i);
            // Remove existing seeds
            while (pit.childElementCount > 0) {
                pit.removeChild(pit.firstChild);
            }

            // Add seeds yet again
            for (let j = 0; j < this.board.pits[i]; j++) {
                pit.appendChild(this.createOneSeed());
            }
        }
    }

    resizePits() {
        const pitSpacing = 4;
        let row = document.getElementById(rowName + '-' + 0);
        let width = row.offsetWidth;
        let height = row.offsetHeight;
        let pitWidth = (width - pitSpacing * (this.noPits + 1)) / this.noPits;
        let pitWrapper;
        if (pitWidth > height) {
            pitWidth = height;
        }
        pitWidth = pitWidth + 'px';

        for (let i = 0; i < this.noPits * 2 + 1; i++) {
            if (i == this.noPits) {
                continue;
            }
            pitWrapper = document.getElementById(pitWrapperName + '-' + i);
            pitWrapper.style.width = pitWidth;

        }

    }

    playPit(i, event) {

        if (this.isAi) {
            this.playAi(i);
            return;
        }

        let viable = this.verifyViableMove(i);
        if (!viable) {
            return;
        }

        this.serverNotify(i);
        this.resetTimeout();

    }

    verifyViableMove(i) {

        if (!this.startGame) {
            // Game didn't start yet
            return false;
        }
        if (this.endGame) {
            // Game has ended already
            return false;
        }

        // Pit 0 is now top right, the middle pit is the bottom left and the last is the bottom right. Better to handle rotation on the pits and seeds
        if (this.board.pits[i] == 0) {
            // Nothing to play
            return false;
        }

        if (this.board.isStorage(i)) {
            // The pit selected is the storage
            // Do nothing or perhaps issue a warning if the playing player attempts this a given number of times
            // Alternatively I could highlight the pits that can be played
            return false;
        }
        if (!this.isBotPlayer) { //The player always has the bord towards them
            // if (!this.board.isSelfPit(i, this.isBotPlayer)) {
            // The pit selected is not on the playing player's side;
            // Do nothing or perhaps issue a warning if the playing player attempts this a given number of times
            // Alternatively I could highlight the pits that can be played
            return false;
        }
        return true;
    }

    playAi(i) {
        let seedsInPit = this.board.pits[i];
        this.board.pits[i] = 0;
        for (; seedsInPit > 0;) {
            i = (i + 1) % (this.noPits * 2 + 2); // Increment index of pit
            if (this.board.isStorage(i) && !this.board.isSelfStorage(i, this.isBotPlayer)) {
                // Prevents from seeding the oponent's storage
                continue;
            }

            // if (i == (this.noPits + 1) + this.isBotPlayer * (this.noPits)) {
            //     // The players pit
            //     continue;
            // }
            this.board.pits[i]++;
            seedsInPit--;
        }


        if (this.board.pits[i] == 1 && this.board.isSelfPit(i, this.isBotPlayer)) {
            // Get the seed from the self's pit
            this.board.pits[i] = 0;
            this.board.pits[this.board.getIdSelfStorage(this.isBotPlayer)]++;

            // Get the seed from the opposite pit
            let otherPit = this.board.getIdOppositePit(i);
            this.board.pits[this.board.getIdSelfStorage(this.isBotPlayer)] += this.board.pits[otherPit];
            this.board.pits[otherPit] = 0;
        }
        if (this.board.isSelfStorage(i, this.isBotPlayer)) {
            // Played last seed in self's storage. Will play again
        }
        else {
            this.isBotPlayer = !this.isBotPlayer;
        }

        if (this.board.selfPitsEmpty(this.isBotPlayer)) {
            this.endGame = true;
            this.isBotPlayer = !this.isBotPlayer;
            this.board.collectSelfPits(this.isBotPlayer);
        }


        // If is a game with an ai make an automated move
        // Otherwise send to server
        if (!this.isBotPlayer && !this.endGame) {
            setTimeout(() => {
                let play = this.player2.makePlay(this.board);
                this.playPit(play);
            }, 1000);
        }
        // Reprint board
        this.printBoard();
    }

    updateState(data) {
        if (!this.startGame) {
            this.startGame = true;

            let [nickname, _] = getLoginInfo();
            this.player1 = nickname;
            this.isBotPlayer = data.board.turn == this.player1;
            if (this.isBotPlayer) {
                this.createTimeout();
            }

            let names = Object.keys(data.board.sides);
            this.player2 = (names[0] == nickname) ? names[1] : names[0];

            if (this.isBotPlayer) {
                showMessage("Your turn");
            }
            else {
                showMessage("Waiting for opponent's turn");
            }
            return;
        }

        this.updateBoard(data);

        if ('winner' in data) {

            closeEventSource();
            this.endGame = true;
            if (data.winner == "It's a tie") {
                showMessage(data.winner);
                return;
            }
            else if (data.winner == this.player1) {
                showMessage("You win");
            }
            else if (data.winner == null) {
                showMessage("Game interrupted without a winner");
            }
            else {
                showMessage(data.winner + " wins!");
            }
        } else {
            if (this.isBotPlayer) {
                showMessage("Your turn");
            }
            else {
                showMessage("Waiting for opponent's turn");
            }
        }
    }

    updateBoard(data) {
        if (!('board' in data)) { return; }
        let pits = data.board
        this.isBotPlayer = data.board.turn == this.player1;
        this.board.pits[this.board.getIdSelfStorage(true)] = data.stores[this.player1]
        this.board.pits[this.board.getIdSelfStorage(false)] = data.stores[this.player2]

        let i = 0;
        for (let j = 0; j < this.noPits; j++, i++) {
            this.board.pits[i] = pits.sides[this.player2].pits[j];
        }
        i++;
        for (let j = 0; j < this.noPits; j++, i++) {
            this.board.pits[i] = pits.sides[this.player1].pits[j];
        }

        this.printBoard();
    }

    pitsEventListener() {
        for (let i = 0; i <= this.noPits * 2 + 1; i++) {
            let pit = document.getElementById(pitName + '-' + i);
            pit.addEventListener('click', this.playPit.bind(this, i), false);
        }
    }

    serverNotify(i) {
        let move;
        if (i > this.noPits) {
            move = i - this.noPits - 1;
        }
        else {
            move = this.noPits - i - 1;
        }
        notify(move);
    }
}