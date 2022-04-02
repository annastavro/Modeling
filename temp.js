
document.getElementById("ok1").addEventListener("click", (ev => {

    let smo = new SMO(0.4, 0.5);
    smo.calculate();
    console.log(smo);
}));

function* lemenGenerator() {
    yield 0;
    yield 1;

    yield 0;
    yield 0;

    yield 1;
    yield 0;

    yield 1;
    yield 1;
}

class Stat {
    source;
    channel1;
    queue;
    channel2;

    constructor(source, channel1, queue, channel2) {
        this.source = source;
        this.channel1 = channel1;
        this.queue = queue;
        this.channel2 = channel2;
    }

    toString() {
        return `${this.source}${this.channel1}${this.queue}${this.channel2}`;
    }
}

class SMO {
    constructor(pi1, pi2) {
        this.pi1 = pi1;
        this.pi2 = pi2;
        this.queueSize = 2;
        this.channel1 = 0;
        this.channel2 = 0;
        this.source = 2;
        this.queue = 0;
        this.rejected = 0;
        this.blocked = 0;
        this.currValue = "2000";
        this.stats = {};
        this.nextValues = {};
        this.nextValues[this.currValue] = [];
        this.allValues = ["2000"];
    }

    processNextStep() {
        let generator = lemenGenerator();
        let numOfLoops = 2 ** (this.channel2 + this.channel1);
        this.currValue = this.statToString();
        this.nextValues[this.currValue] = [];
        for (let i = 0; i < numOfLoops; i++) {
            let nextSource = this.source;
            let nextChannel1 = this.channel1;
            let nextQueue = this.queue;
            let nextChannel2 = this.channel2;
            let rejected = false;
            let multPi1 = "";
            let multPi2 = "";
            if (nextChannel2) {
                if (1 - this.pi2 > generator.next().value) {
                    nextChannel2 = 0;
                    multPi2 = "(1-π2)";
                } else {
                    multPi2 = "π2"
                }
            }
            if (nextChannel2 === 0 && nextQueue > 0) {
                nextChannel2 = 1;
                nextQueue = nextQueue - 1;
            }
            if (nextChannel1) {
                if (1 - this.pi1 > generator.next().value) {
                    multPi1 = "(1-π1)";
                    if (nextQueue >= this.queueSize) {
                        nextChannel1 = 0;
                        rejected = true;
                    } else {
                        nextChannel1 = 0;
                        nextQueue = nextQueue + 1;
                    }
                } else {
                    multPi1 = "π1";
                }
            }
            if (nextChannel2 === 0 && nextQueue > 0) {
                nextChannel2 = 1;
                nextQueue = nextQueue - 1;
            }
            if (nextChannel1 === 1 && this.source === 1) {
                nextSource = 0;
            } else {
                if (nextSource === 2) {
                    nextSource = 1;
                } else if (nextSource === 1) {
                    nextSource = 2;
                    nextChannel1 = 1;
                } else if (nextChannel1 === 0) {
                    nextSource = 2;
                    nextChannel1 = 1;
                }
            }
            if (nextSource === 0) {
                this.blocked++;
            }
            this.saveStats(nextSource, nextChannel1, nextQueue, nextChannel2, multPi1, multPi2, rejected);
            let nextStat = this.nextStatToString(nextSource, nextChannel1, nextQueue, nextChannel2);
            if (this.allValues.indexOf(nextStat) === -1) {
                this.allValues.push(nextStat);
            }
        }
    }

    calculate() {
        for (let value of this.allValues) {
            this.decodeValue(value);
            this.processNextStep();
        }
    }

    decodeValue(value) {
        this.source = Number(value[0]);
        this.channel1 = Number(value[1]);
        this.queue = Number(value[2]);
        this.channel2 = Number(value[3]);
    }

    statToString() {
       return new Stat(this.source, this.channel1, this.queue, this.channel2).toString();
    }

    nextStatToString(nextSource, nextChannel1, nextQueue, nextChannel2) {
        return new Stat(nextSource, nextChannel1, nextQueue, nextChannel2).toString();
    }

    saveStats(nextSource, nextChannel1, nextQueue, nextChannel2, pi1, pi2, rejected) {
        let stat = new Stat(nextSource, nextChannel1, nextQueue, nextChannel2).toString();
        this.nextValues[this.currValue].push(`${pi1}${pi2}P${stat}${rejected ? ', rejected' : ''}`);
    }
}