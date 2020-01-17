var util = require("util");

var spawn = require("child_process").spawn;
var process = spawn('python3',["Energy.py"]);

util.log('readingin')

process.stdout.on('data',function(chunk){

    var textChunk = chunk.toString('utf8');// buffer to string

    util.log(textChunk);
});
