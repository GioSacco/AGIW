const CryptoJS    = require("crypto-js");
const getCRC8     = require('node-enocean-crc8');
const cheerio     = require('cheerio');
const fs          = require('fs');
const all_path    = require("../core_data/all_path.json");
const utils       = require('../service/utils');

var commonEmitter = utils.commonEmitter;

// FUNZIONE CHE GENERA TUTTI I MASKED SHINGLE DI UN SINGOLO SHINGLE VECTOR
function generateMaskedSingle(pageShingleVector) {
    var v8 = [pageShingleVector];

    var v7 = [];
    for (var i = 0; i <= pageShingleVector.length -1; i++) {
        var v7Tmp = ["","","","","","","",""];
        v7Tmp[i] = "*";

        for (var j = 0; j <= pageShingleVector.length -1; j++) {
            if (i != j) {
                v7Tmp[j] = pageShingleVector[j]
            }
        } 
        v7.push(v7Tmp);
    }

    var v6 = [];
    for (var i = 0; i <= pageShingleVector.length -1; i++) {
        for (var j = 0; j <= pageShingleVector.length -1; j++) {
            var v6Tmp = ["*","*","*","*","*","*","*","*"];

            if (j<i) {
            v6Tmp[j] = pageShingleVector[j];
            } else if (j==i) { 
                v6Tmp[j] = "*";
            } else {
                v6Tmp[j] = "*";
                for (var k = 0; k <= pageShingleVector.length -1; k++) {
                    if (k != i && k != j) {
                        v6Tmp[k]=pageShingleVector[k];
                    }
                }
                v6.push(v6Tmp);
            }
        
        } 
    }

    return {
        "v8": v8,
        "v7": v7,
        "v6": v6
    };
    
}

// FUNZIONE CHE CREA L'INSIEME DI TUTTI I MASKED SHINGLE ASSEGNANDO A CIASCUNO
// IL NUMERO DI PAGINE COPERTE
function createMaskedShingle(pagesShingleVectors) {

    var hashTable = {};

    Object.keys(pagesShingleVectors).forEach((pageShingleKey) => {
        var v6 = [];
        var v7 = [];
        var v8 = [];

        const pageMaskedShigleVectors = generateMaskedSingle(pagesShingleVectors[pageShingleKey]);

        v6 = pageMaskedShigleVectors.v6;
        v7 = pageMaskedShigleVectors.v7;
        v8 = pageMaskedShigleVectors.v8;

        v6.forEach((v6Item) => {
            if (Object.keys(hashTable).includes(v6Item.toString())) {
                hashTable[v6Item] = hashTable[v6Item] + 1;
            } else {
                hashTable[v6Item.toString()] = 1;
            }
        });

        v7.forEach((v6Item) => {
            if (Object.keys(hashTable).includes(v6Item.toString())) {
                hashTable[v6Item] = hashTable[v6Item] + 1;
            } else {
                hashTable[v6Item.toString()] = 1;
            }
        });

        v8.forEach((v6Item) => {
            if (Object.keys(hashTable).includes(v6Item.toString())) {
                hashTable[v6Item] = hashTable[v6Item] + 1;
            } else {
                hashTable[v6Item.toString()] = 1;
            }
        });

    });

    fs.writeFile('core_data/temp/maskedHashTable.json', JSON.stringify(hashTable), function(err, result) {
        if (err) {
            commonEmitter.emit("FIRST_STEP_ERROR");
            console.log("ERROR DURING MASK FILE CREATION: "+err);
        } else {
            commonEmitter.emit("FIRST_STEP_COMPLETE");
        }
    });

}

// FUNZIONE CHE A PARTIRE DALLA LISTA DI SHINGLE UTF8 DI UNA PAGINA RITORNA UN VETTORE - SHINGLE VECTOR - DI 8 BYTE
function getPageShingleVector(pageShingles, firstRandomCoefficient, secondRandomCoefficient, randomIntValue) {
    var shingleVector = []
    
    for(var i = 0; i < 8; i++){
        var v_app = [] 
        var a = firstRandomCoefficient[i]
        var b = secondRandomCoefficient[i]
        pageShingles.forEach((shingle) => {
            v_app.push(((a * shingle) + b) % randomIntValue)
        });
        shingleVector.push(v_app.min());
    }

    return shingleVector
}

// FUNZIONE PER ASSOCIARE AD OGNI PAGINA UNO SHINGLE VECTOR DI 8 BYTE
function startFirstStep(keyWord) {
    var pagesShingleVectors = {};

    const U = Math.pow(2, 32);
    const randomIntValue = randomIntFromInterval(U,2*U);
    const randomCoefficients = createRandomCoefficient(randomIntValue);

    const firstRandomCoefficient = randomCoefficients.first;
    const secondRandomCoefficient = randomCoefficients.second;

    // Filtra i path alle directory del dataset prendendo quelli che contengono la parola chiave ricevuta come parametro
    const filterLocalPaths = all_path.filter((localPath) => {
        return localPath.includes(keyWord);
    });

    filterLocalPaths.forEach(localDirectory => { 
        var allPagesOfDirectory = getDirectories(localDirectory);

        // Per ogni pagina html presente nella directory corrente, crea lo shingle vector di 8 byte corrispondente
        allPagesOfDirectory.forEach( page => {

            var pageShingles = []
            var pageTagList = [];

            const $ = cheerio.load(fs.readFileSync(localDirectory+'/'+page));
            pageTagList = $('*').get().map(el => el.name);

            l = 10 // larghezza della finestra

            for (var i = 0; i <= pageTagList.length - 1; i++) {

                if (i + l <= pageTagList.length) {
                    const shingleTagsStringList = pageTagList.slice(i, i+l).join(' '); // shingle in formato stringa - tag html
                    const shingleTagsUtf8List = getCRC8(Buffer.from(CryptoJS.SHA1(shingleTagsStringList).words)); // shingle in formato utf8
                    pageShingles.push(shingleTagsUtf8List);
                } else {
                    break;
                }

            }

            const pageKey = localDirectory+'/'+page;
            const pageShingleVector = getPageShingleVector(pageShingles, firstRandomCoefficient, secondRandomCoefficient, randomIntValue); // richiama la funzione per creare dalla lista di shingle lo shingle vector associato alla pagina
            
            pagesShingleVectors[pageKey] = pageShingleVector;

        });

    });

    fs.writeFile('core_data/temp/shingleVectors.json', JSON.stringify(pagesShingleVectors), function(err, result) {
        if (err) {
            commonEmitter.emit("FIRST_STEP_ERROR");
            return "ERROR DURING SHINGLE FILE CREATION: "+err;
        } else {
            return createMaskedShingle(pagesShingleVectors);
        }
    });

}

/* FUNZIONI DI UTILITY */

function getDirectories(path) {
    return fs.readdirSync(path).filter(function (file) {
      return fs.statSync(path+'/'+file);
    });
}

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function createRandomCoefficient(randomValue) {
    var firstCoefficients = []
    var secondCoefficients = []

    for(i = 0; i < 8; i++){   
      firstCoefficients.push(randomIntFromInterval(1,(randomValue-1)));
      secondCoefficients.push(randomIntFromInterval(0,(randomValue-1)));
    }

    return {
        "first": firstCoefficients,
        "second": secondCoefficients
    }
}

module.exports.startFirstStep = startFirstStep;