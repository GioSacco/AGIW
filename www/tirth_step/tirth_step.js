const utils                     = require('../service/utils');
const maskedHashTableOrigin     = require('../core_data/temp/maskedHashTable.json');
const shingleVectors            = require('../core_data/temp/shingleVectors.json');

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

function evaluePerformance(cluster) {
  var denominatore_precision = 0;
  var numeratore_precision = 0;

  var denominatore_recall = Object.keys(shingleVectors).length;

  Object.keys(cluster).forEach((clusterKey) => {
    var value = cluster[clusterKey];

    var dizionario_precision = {};

    value.forEach((link) => {
      var first = link.indexOf("/");
      var second = link.indexOf("/", first + 1);
      var tirth = link.indexOf("/", second + 1);
      var forth = link.indexOf("/", tirth + 1);
      var five = link.indexOf("/", forth + 1);

      if (Object.keys(dizionario_precision).includes(link.substr(0, five)) ) {
        var count = dizionario_precision[link.substr(0, five)];
        count = count + 1;
        dizionario_precision[link.substr(0, five)] = count;
      } else {
        dizionario_precision[link.substr(0, five)] = 1;
      };
    });

    const clusterPrecision = Math.max.apply(null, Object.values(dizionario_precision)) / value.length;

    console.log("");
    console.log("Cluster: "+ clusterKey);
    console.log("Precision: "+ clusterPrecision);
    console.log("-------------------------");
    console.log("");

    numeratore_precision = numeratore_precision + Math.max.apply(null, Object.values(dizionario_precision));
    denominatore_precision = denominatore_precision + value.length;

  });

  const globalPrecision = numeratore_precision/denominatore_precision;
  const recall = numeratore_precision/denominatore_recall;
  const f1 = (2*globalPrecision*recall)/(globalPrecision+recall);

  console.log("Global Precision: "+globalPrecision);
  console.log("Recall: "+recall);
  console.log("F1: "+f1);

}

function startTirthStep(maxCoveredMaskedKeys) {

  var cluster = {};

  Object.keys(shingleVectors).forEach((pageShingleVectorKey) => {
    var maxCoveringValue = 0;
    var maxMaskedVectorKey;

    maxCoveredMaskedKeys.forEach((maskedKey) => {

      if (isCovering(shingleVectors[pageShingleVectorKey].toString(), maskedKey)) {
        if (maxCoveringValue <= maskedHashTableOrigin[maskedKey]) {
          maxMaskedVectorKey = maskedKey;
          maxCoveringValue = maskedHashTableOrigin[maskedKey];
        }
      }

    });


    if (maxMaskedVectorKey) {
      if (!cluster[maxMaskedVectorKey]) {
        cluster[maxMaskedVectorKey] = [pageShingleVectorKey];
      } else {  
        var array = cluster[maxMaskedVectorKey];
        array.push(pageShingleVectorKey);
        cluster[maxMaskedVectorKey] = array;
      }
    }

  });

  evaluePerformance(cluster);

}

module.exports.startTirthStep = startTirthStep;