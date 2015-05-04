var codes = require('./src/codes');
var _ = require('lodash');
var csv = '';
var index = 0;
_.each(codes, function(code) {
  csv += code;
  csv += ((++index % 4) === 0) ? "\n" : ",";
});
console.log(csv);
