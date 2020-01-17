var mongo = require("mongodb");

var mongodbUri = "mongodb://127.0.0.1/opendatacam";

mongo.MongoClient.connect (mongodbUri, function (err, db) {

  db.collection('countedItemsForThisFrame', function(err, collection) {
    // open a tailable cursor
    console.log("== open tailable cursor");
    collection.find({}, {tailable:true, awaitdata:true, numberOfRetries:-1})
                      .sort({ $natural: 1 })
                      .each(function(err, doc) {
      console.log(doc);
      // set pin to high -> start child process
      // import express JS module into app 

// START CHILD PROCESS CODE
var util = require("util");

var spawn = require("child_process").spawn;
var process = spawn('python',["Energy.py"]);

util.log('readingin')

process.stdout.on('data',function(chunk){

    var textChunk = chunk.toString('utf8');// buffer to string

    util.log(textChunk);
});
// END OF CODE SNIPPET 



    })
  });

});