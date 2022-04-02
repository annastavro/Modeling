document.getElementById("ok").addEventListener("click", (ev => {
    let ro = Number(document.getElementById("ro").value);
    let pi1 = Number(document.getElementById("pi1").value);
    let pi2 = Number(document.getElementById("pi2").value);
    const numberOfSteps = 100000;
    let smo = new SMO(ro, pi1, pi2);
    for (let i = 0; i < numberOfSteps; i++) {
        smo.processNextStep();
    }
    smo.close(); // to have no unhandled orders

    let result = "Результаты: <br/>";
    let pRej = (smo.rejectedOnSrc + smo.rejectedOnChannel1) / smo.ordersCount;
    let pBlock = smo.blocked / smo.ordersCount;
    let Q = smo.processed / smo.ordersCount;
    let A = smo.processed / numberOfSteps;

    let meanQueue = 0;
    let meanSystem = 0;
    let meanTimeChannels = 0;
    for (let key in smo.stats) {
        result += `P${key} = ${smo.stats[key] / numberOfSteps}<br/>`;
        meanQueue += smo.stats[key] * Number(key[0]);
        meanSystem += smo.stats[key] * (Number(key[0]) + Number(key[1]) + Number(key[2]));
        meanTimeChannels += smo.stats[key] * (Number(key[1])/ (1 - smo.pi1) + Number(key[2])/ (1 - smo.pi2));
    }
    meanQueue /= numberOfSteps;
    meanSystem /= numberOfSteps;
    meanTimeChannels /= numberOfSteps;
    //let lambda = 0.5 * (1 - pBlock);
    
    let meanTimeC1 = smo.totalChannel1Time / (smo.ordersCount - smo.rejectedOnSrc); // 
    let meanTimeC2 = smo.totalChannel2Time / (smo.ordersCount - smo.rejectedOnSrc - smo.rejectedOnChannel1); // - smo.rejectedOnSrc
    let meanQueueTime = smo.totalQueueTime / (smo.ordersCount - smo.rejectedOnSrc); // - smo.rejectedOnSrc
    let meanTimeInSystem = meanQueueTime + meanTimeC1 + meanTimeC2;
        //(smo.totalQueueTime + smo.totalChannel1Time + smo.totalChannel2Time)/(smo.ordersCount-smo.rejectedOnSrc); 
        //smo.pi1 && smo.pi2  
        // ? meanQueueTime + 1/(1 - smo.pi1 ) + 1/(1 - smo.pi2) 
    //meanQueueTime + 1/(1 - smo.pi1 ) + 1/(1 - smo.pi2); 
    // meanQueueTime + meanTimeChannels; // meanTimeC1 + meanTimeC2 +
    result += `Вероятность отказа: ${pRej}<br/>`;
    result += `Вероятность блокировки: ${pBlock}<br/>`;
    result += `Средняя длина очереди: ${meanQueue}<br/>`;
    result += `Среднее количество заявок в системе: ${meanSystem}<br/>`;
    result += `Относительная пропускная способность: ${Q}<br/>`;
    result += `Абсолютная пропускная способность: ${A}<br/>`;
    result += `Среднее время заявок в очереди: ${meanQueueTime}<br/>`;
    result += `Среднее время заявок в системе: ${meanTimeInSystem}<br/>`;
    document.getElementById("result").innerHTML = result;
}));

function* lemenGenerator() {
    const m = 2 ** 32;
    const a = 1664525;
    const c = 1013904223;
    let R = 1;
    while (true) {
        R = (a * R + c) % m;
        yield R / m;
    }
}

class State {
    queue;
    channel1;
    channel2;

    constructor(queue, channel1, channel2) {
        this.queue = queue;
        this.channel1 = channel1;
        this.channel2 = channel2;
    }

    toString() {
        return `${this.queue}${this.channel1}${this.channel2}`;
    }
}

class SMO {
    constructor(ro, pi1, pi2) {
        this.ro = ro;
        this.pi1 = pi1;
        this.pi2 = pi2;
        this.queueSize = 2;
        this.channel1 = 0;
        this.channel2 = 0;
        this.queue = 0;
        this.totalQueueTime = 0;
        this.totalChannel1Time = 0;
        this.totalChannel2Time = 0;
        this.processed = 0;
        this.rejectedOnSrc = 0;
        this.rejectedOnChannel1 = 0;
        this.blocked = 0;
        this.ordersCount = 0;
        this.stats = {};
        this.saveStats();
        this.generator = lemenGenerator();
    }

    processNextStep() {
        var orderDone = this.generator.next().value < 1 - this.ro;
        var channel1Finished = this.generator.next().value < 1 - this.pi1;
        var channel2Finished = this.generator.next().value < 1 - this.pi2;
        // console.log(new State(this.queue, this.channel1, this.channel2));
        // channels logic starts here
        if (this.channel2 && channel2Finished) {
            this.channel2 = 0;
            this.processed++;
        }
        if (this.channel1 && channel1Finished){
            this.channel1 = 0;
            if (!this.channel2)
            {
                this.channel2 = 1;
            }
            else
            {
                this.rejectedOnChannel1++;
            }
        }

        //generate order and push it either to queue or direct to channel
        if (orderDone){
            this.ordersCount++;

            if (!this.channel1){
                this.channel1 = 1;
            }
            else
            {
                if (this.queue < this.queueSize){
                    this.queue++;
                }
                else
                {
                    this.rejectedOnSrc++;
                }
            }
        }

        if (!this.channel1 && this.queue){
            this.channel1 = 1;
            this.queue--;
        }

        this.totalQueueTime += this.queue;
        this.totalChannel1Time += this.channel1;
        this.totalChannel2Time += this.channel2;
        this.saveStats();
    }

    close(){
        this.ro = 1;
        if (this.channel1 >= 1 || this.channel2 >= 1)
            return;
        while(this.queue || this.channel1 || this.channel2){
            this.processNextStep();
        }
    }

    saveStats() {
        let stat = new State(this.queue, this.channel1, this.channel2);
        if (!this.stats[stat]) {
            this.stats[stat] = 1;
        } else {
            this.stats[stat]++;
        }
    }
}
