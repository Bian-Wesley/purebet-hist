var solanaWeb3 = require("@solana/web3.js");
var fs = require("fs");
var axios = require("axios");
var bs58 = require("bs58");
var programID = new solanaWeb3.PublicKey("39mBcnQ27QA9nNZmM6VrumE2vtqs5v3HD7t7RGv9kXUV");
var connection = new solanaWeb3.Connection("https://spring-frosty-snowflake.solana-mainnet.discover.quiknode.pro/5584f3ace79637af8f83a6f135554af9e0f0ffca/", "confirmed");
var stopPoint = 1671508005000;
var canceledAddrs = new Set([]);

function write(payload){
    //need date, number
    fs.appendFile("volumes.csv", payload, err => {
        if (err) {
            console.error(err);
        }
        //console.log(payload);
    });
}

function processInstrs(tx){
    //go through instrs
    var output = 0;
    var instrs = tx.data.transaction.message.instructions;
    for(var i = 0; i < instrs.length; i++){
        if(instrs[i].accounts.length == 7 && bs58.decode(instrs[i].data).length == 1){
            canceledAddrs.add(tx.transactionHash);
        }
        else if(instrs[i].accounts.length == 6 && bs58.decode(instrs[i].data).length != 0){
            if(canceledAddrs.has(tx.transactionHash)){
                var dataArr = bs58.decode(instrs[i].data);
                var awayStake = (dataArr[5] * 256 + dataArr[6]) / 100;
                var homeStake = (dataArr[3] * 256 + dataArr[4]) / 100;
                var side = dataArr[0];
                var stake = side == 0 ? homeStake : awayStake;
                output += stake;
            }
        } 
    }
    return output;
    //record cancelation
    //write started bet if not in cancelation set
}

async function extractBatch(batch50, vols){
    var payload = {transactionHashes: batch50};
    //console.log(payload);
    var infosRaw = await axios.post("https://api.solana.fm/v0/transactions", payload);
    var txs = infosRaw.data.result;
    for(var t = 0; t < txs.length; t++){
        if(Object.keys(txs[t]).length == 0){
            //per solanafm nacholas response, {} means a tx isn't indexed and should be skipped
            continue;
        }
        console.log(txs[t]);
        //console.log("tx number ", t);
        var volume = processInstrs(txs[t]);
        //var dateStr = yearMonDay(txs[t].blockTime); //not sure if this is the way to extract block time
        
    }
}
//extractBatch(["4e5qjjL9cn5rTVuYTBuKVRHikV3Ghwjh2fmwW47uw49FuTEkujohzW8RVnhkPbMEHhLaUvofNSeByKspKVVWazaL"], 1)

function isCancelOrRefund(instr){
    var isCancel = instr.accounts.length == 7 && bs58.decode(instr.data).length == 1;
    var isRefund = instr.accounts.length == 8 && bs58.decode(instr.data).length == 1;
    return isCancel || isRefund;
}

function isStart(instr){
    return instr.accounts.length == 6 && bs58.decode(instr.data).length == 7;
}

function getBetAcc(instr, accs){
    var betAccInd = instr.accounts[0];
    var betAccPubkey = accs[betAccInd];
    return betAccPubkey.toBase58();
}

function getStake(instr){
    var dataArr = bs58.decode(instr.data);
    var homeStake = dataArr[3] * 256 + dataArr[4];
    homeStake /= 100;
    var awayStake = dataArr[5] * 256 + dataArr[6];
    awayStake /= 100;
    var side = dataArr[0];
    return side == 0 ? homeStake : awayStake;
}

function yearMonDay(blockTime){
    var dateForm = new Date(blockTime);
    return dateForm.getFullYear() + "/" + (dateForm.getMonth() + 1) + "/" + dateForm.getDate();
}

function genDays(){
    var output = [];
    var currDate = new Date();
    while(currDate > stopPoint){
        //var dateified = new Date(currDate);
        output.push(yearMonDay(currDate));
        currDate = currDate - 24 * 60 * 60 * 1000;
    }
    //start from curr day, go back one day at a time and push to array
    //stop on December 20th 2022
    return output;
}
//console.log(genDays());

function payloadify(days, daysToVol){
    var payload = "";
    for(var d = 0; d < days.length; d++){
        var day = days[d];
        var vol = daysToVol[day];
        if(vol == null){
            vol = 0;
        }
        var line = day + "," + vol + "\n";
        payload += line;
        console.log(line);
    }
    write(payload);
}

async function main(){
    var days = genDays();
    var daysToVol = {};
    var shouldContinue = true;
    var startSig = null;   
    while(shouldContinue){
        var batch50 = [];
        var batch1000;
        try{
            batch1000 = await connection.getSignaturesForAddress(programID, {before: startSig});
        } catch(err){
            payloadify(days, daysToVol);
        }
        
        for(var x = 0; x < batch1000.length; x++){
            var volFromThisTx = 0;
            var txInfo;
            try{
                txInfo = await connection.getTransaction(batch1000[x].signature);
            } catch(err){
                payloadify(days, daysToVol);
            }
            var accs = txInfo.transaction.message.accountKeys;
            var instructions = txInfo.transaction.message.instructions;
            for(var i = 0; i < instructions.length; i++){
                if(isCancelOrRefund(instructions[i])){
                    canceledAddrs.add(getBetAcc(instructions[i], accs));
                }
                else if(isStart(instructions[i])){
                    if(!canceledAddrs.has(getBetAcc(instructions[i], accs))){
                        volFromThisTx += getStake(instructions[i]);
                    }
                }
            }
            var day = yearMonDay(txInfo.blockTime * 1000);
            console.log(day);
            console.log(volFromThisTx);
            if(daysToVol[day] == null){
                daysToVol[day] = volFromThisTx;
            }
            else{
                daysToVol[day] += volFromThisTx;
            }

            /*
            if(batch1000[x].blockTime < stopPoint){
                return;
            }
            batch50.push(batch1000[x].signature);
            if(batch50.length == 50 || x == batch1000.length - 1){
                await extractBatch(batch50);
                batch50 = [];
            }
            */
        }
        startSig = batch1000[batch1000.length - 1].signature;
        console.log(startSig);
        shouldContinue = batch1000[batch1000.length - 1].blockTime * 1000 > stopPoint;
        //console.log(days);
        //console.log(daysToVol);
    }
    payloadify(days, daysToVol);
}

main();

