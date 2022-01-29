
export class Player {
    constructor() {
        this.score = 0;
    }
}

export class PlayerAI extends Player {
    constructor(difficulty) {
        super();
        this.difficulty = difficulty;
    }

    makePlay(board) {
        // AI is always top pits
        if (this.difficulty == 1) {
            return this.makePlayEasy(board);
        }
        else if (this.difficulty == 2) {
            return this.makePlayMedium(board);
        }
        else if (this.difficulty == 3) {
            return this.makePlayHard(board);
        }
    }

    getPlayablePits(board){

        let playable = [...Array(board.noPits).keys()];
        return playable.filter((i) => { return board.pits[i] != 0 });
    }
    makePlayEasy(board) {
        let playable = this.getPlayablePits(board);
        let r = Math.floor(Math.random() * playable.length);
        return playable[r];
    }

    makePlayMedium(board){
        if(Math.random() < 0.5){
            return this.makePlayEasy(board);
        }
        else{
            return this.makePlayHard(board);
        }
    }

    makePlayHard(board) {
        // First see if we can take a nice amount of seeds by landing our last piece in a house opposite to the opponent's
        let playable = this.getPlayablePits(board);
        let max = 0, maxIndex = 0;
        for (let i = 0; i < playable.length; i++) {
            let pitIndex = playable[i];
            let lastPit = pitIndex + board.pits[pitIndex];
            if (board.pits[lastPit] != 0 || lastPit >= board.noPits) {
                continue;
            }
            let opposite = board.getIdOppositePit(lastPit)
            let oppositeSeeds = board.pits[opposite]
            if ( oppositeSeeds > max) {
                max = oppositeSeeds;
                maxIndex = pitIndex;
            }
        }
        if(max > 0){
            return maxIndex;
        }

        // Try to play again by placing into our storage. The closest it is to the storage the better
        // At least it seems like realistically that would be the case
        for(let i = playable.length -1; i >= 0; i--){
            let pitIndex = playable[i];
            let lastPit = pitIndex + board.pits[pitIndex];
            if(lastPit == board.noPits){
                return pitIndex;
            }
        }

        // No good move, will try to make seeds stay on our side
        for(let i = 0; i < playable.length; i++){
            let pitIndex = playable[i];
            let lastPit = pitIndex + board.pits[pitIndex]
            if(lastPit < board.noPits){
                return pitIndex;
            }
        }
        return this.makePlayEasy(board); // Play a random move
    }
}