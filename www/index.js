const first_step = require("./first_step/first_step");
const second_step = require("./second_step/second_step");
const tirth_step = require("./tirth_step/tirth_step");

var utils = require('./service/utils');

var commonEmitter = utils.commonEmitter;

commonEmitter.on('FIRST_STEP_COMPLETE', () => {
    const maxCoveredMaskedKeys = second_step.startSecondStep();
    tirth_step.startTirthStep(maxCoveredMaskedKeys);
});
commonEmitter.on('FIRST_STEP_ERROR', () => {
    console.log('FIRST_STEP_ERROR');
});

// INIZIALIZZO LA LISTA DI SINGHLE VECTOR ASSOCIATI A TUTTE LE PAGINE
// PRESENTI NEL DATASET ED APPARTENENTI ALLA CATEGORIA SELZIONATA
first_step.startFirstStep('study');

