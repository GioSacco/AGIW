var events = require('events');

var em = new events.EventEmitter();

module.exports.commonEmitter = em;

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
}

Array.prototype.max = function() {
    return Math.max.apply(null, this);
};
  
  Array.prototype.min = function() {
    return Math.min.apply(null, this);
};