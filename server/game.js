const { builtinModules } = require('module');
const { Board } = require('./board.js');


const pitWrapperName = "game-board-pit-wrapper";
const pitName = "game-board-pit";
const seedName = "game-board-seed";
const storageWrapperClassName = "game-board-storage-wrapper";
const storageClassName = 'game-board-storage';
const rowName = "game-board-pits-row";

module.exports.Game = class {
    noOfPlay = 0;
    timeoutTime = 120;
    constructor(configs) {
        this.noPits = configs.noPits;
        this.noSeeds = configs.noSeeds;
        this.isAi = configs.false;
        this.player1 = configs.first;
        this.player2 = configs.second;
        this.createData();

    }

    createData() {
        this.board = new Board(this.noPits, this.noSeeds);
        this.startGame = true;
        this.endGame = false;
        this.isBotPlayer = true;
        this.lastPlayedPit = -1;
    }

    getNoPits() {
        return this.noPits;
    }

    getPlayers() {
        return [this.player1, this.player2];
    }

    getWinner() {
        if (this.endGame) {
            let store1 = this.board.pits[this.board.getIdSelfStorage(true)];
            let store2 = this.board.pits[this.board.getIdSelfStorage(false)];
            if (store1 > store2) {
                return this.player1;
            }
            else if (store2 > store1) {
                return this.player2;
            }
            else {
                return "It's a tie";
            }
        }
        return null;
    }

    createTimeout() {
        this.timeout = setTimeout(this.gameTimedOut, 1000 * this.timeoutTime);
    }

    resetTimeout() {
        clearTimeout(this.timeout);
        this.createTimeout();
    }

    gameTimedOut() {
        return; // Debug
        this.endGame = true;
        leave();
    }

    checkPlayerMove(nick) {
        let player = this.isBotPlayer ? this.player1 : this.player2;
        return nick == player;
    }

    playPlayerPit(nick, number) {
        if (!this.checkPlayerMove(nick)) {
            return false;
        }
        let i;
        if (nick == this.player2) {
            i = number;
        }
        else {
            i = this.noPits + number + 1;
        }
        this.lastPlayedPit = number;

        return this.playPit(i);
    }

    playPit(i) {
        this.noOfPlay++;
        let viable = this.verifyViableMove(i);
        if (!viable) {
            return false;
        }
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

        return true;

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
        if (!this.board.isSelfPit(i, this.isBotPlayer)) {
            // The pit selected is not on the playing player's side;
            // Do nothing or perhaps issue a warning if the playing player attempts this a given number of times
            // Alternatively I could highlight the pits that can be played
            return false;
        }
        return true;
    }

    getGameState() {


        let state = {

            board: {
                turn: (this.isBotPlayer ? this.player1 : this.player2),
                sides: {
                    [this.player1]: {
                        store: this.board.pits[this.board.getIdSelfStorage(true)],
                        pits: this.board.pits.slice(this.noPits + 1, 2 * this.noPits + 1)
                    },
                    [this.player2]: {
                        store: this.board.pits[this.board.getIdSelfStorage(false)],
                        pits: this.board.pits.slice(0, this.noPits)
                    }
                }
            },
            stores: {
                [this.player1]: this.board.pits[this.board.getIdSelfStorage(true)],
                [this.player2]: this.board.pits[this.board.getIdSelfStorage(false)]
            }
        }

        if (this.lastPlayedPit != -1) {
            state.pit = this.lastPlayedPit
        }

        if (this.endGame) {
            state.winner = this.getWinner();
        }
        return state;
    }

}
