const utils             = require('../service/utils');
const maskedHashTableOrigin   = require('../core_data/temp/maskedHashTable.json');
const shingleVectors   = require('../core_data/temp/shingleVectors.json');
var cloneDeep = require('lodash.clonedeep');

function isCovering(v8Key, maskedKey) {

  const v8KeyList = v8Key.split(',');
  const maskedKeyList = maskedKey.split(',');

  for (var i = 0; i <= v8KeyList.length - 1; i++) {
    if ((v8KeyList[i] != maskedKeyList[i]) && (maskedKeyList[i] != '*')) {
      return false;
    }
  }
  return true;
}

function startSecondStep() {

    var maskedHashTable = cloneDeep(maskedHashTableOrigin);
    
    const inverseSortedMaskedKeys = Object.keys(maskedHashTable).sort(function(a,b) {
      return maskedHashTable[a]-maskedHashTable[b];
    });

    const inverseSortedAllv8Keys = inverseSortedMaskedKeys.filter((key) => {
      return !key.includes("*");
    });

    var sortedMaskedKeys = Object.keys(maskedHashTable).sort(function(a,b) {
      return maskedHashTable[b]-maskedHashTable[a];
    });

    var sortedAllMaskedKeys = sortedMaskedKeys.filter((key) => {
      return key.includes("*");
    });

    inverseSortedAllv8Keys.forEach((v8Key) => {
      var isCovered = false;

      sortedAllMaskedKeys.forEach((maskedKey) => {
        if (isCovering(v8Key, maskedKey)) {
          if (!isCovered) {
            isCovered = true;
          } else {
            maskedHashTable[maskedKey] = +maskedHashTable[maskedKey] == 0 ? 0 : +maskedHashTable[maskedKey] - maskedHashTable[v8Key];
          }
        } 
      });

      sortedMaskedKeys = Object.keys(maskedHashTable).sort(function(a,b) {
        return maskedHashTable[b]-maskedHashTable[a];
      });
  
      sortedAllMaskedKeys = sortedMaskedKeys.filter((key) => {
        return key.includes("*");
      });

    });

    var maxValue = 0;

    sortedAllMaskedKeys.forEach((key) => {
      if (maxValue < maskedHashTable[key]) {
        maxValue = maskedHashTable[key];
      }
    });

    const threshold = maxValue * 0.1;

    const maxCoveredMaskedKeys = Object.keys(maskedHashTable).filter((key) => {
      return maskedHashTable[key] >= threshold && key.includes('*');
    });

    return maxCoveredMaskedKeys;

}



module.exports.startSecondStep = startSecondStep;