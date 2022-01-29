
module.exports.Board = class {
    constructor(noPits, noSeeds) {
        this.noPits = noPits;
        this.noSeeds = noSeeds;

        this.pits = new Array(this.noPits * 2 + 2).fill(this.noSeeds);
        this.pits[this.noPits] = 0; // Upper player's storage
        this.pits[2 * this.noPits + 1] = 0; // Bottom player's storage
    }

    isSelfStorage(i, selfIsBottom) {
        return (i == this.noPits * 2 + 1 && selfIsBottom) || (i == this.noPits && !selfIsBottom);
    }

    isStorage(i) {
        return (i == this.noPits * 2 + 1 || i == this.noPits);
    }

    isSelfPit(i, selfIsBottom) {
        // Pit that is not a storage
        // Is a self pit if the pit is on the top (i< this.noPits) and it isn't the bottom player
        // Or the pit is in the bottom (i > this.noPits) and it is the bottom player
        return (i >= 0 && i < this.noPits && !selfIsBottom) || (i > this.noPits && i < this.noPits * 2 + 1 && selfIsBottom);
    }

    getIdSelfStorage(selfIsBottom) {
        return this.noPits + selfIsBottom * (this.noPits + 1);
    }

    getIdOppositePit(i) {
        if (this.isStorage(i)) {
            return (i + this.noPits + 1) % (this.noPits * 2 + 2);
        }
        if (i < this.noPits) {
            return (this.noPits * 2 - i);
        }
        else if (i < this.noPits * 2) {
            return this.noPits - (i % this.noPits);
        }
        else {
            // Last pit of the bottom row (that isn't a storage)
            return 0;
        }
    }

    selfPitsEmpty(selfIsBottom) {
        if (selfIsBottom) {
            for (let i = this.noPits + 1; i < this.noPits * 2 + 1; i++) {
                if (this.pits[i] > 0) {
                    return false;
                }
            }
            return true;
        }
        else {
            for (let i = 0; i < this.noPits; i++) {
                if (this.pits[i] > 0) {
                    return false;
                }
            }
            return true;
        }
    }

    collectSelfPits(selfIsBottom) {
        let count = 0;
        if (selfIsBottom) {
            for (let i = this.noPits + 1; i < this.noPits * 2 + 1; i++) {
                count += this.pits[i];
                this.pits[i] = 0;
            }
        }
        else {
            for (let i = 0; i < this.noPits; i++) {
                count += this.pits[i];
                this.pits[i] = 0;
            }
        }
        this.pits[this.getIdSelfStorage(selfIsBottom)] += count;
    }
}