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


// and creates its variable. 
var express = require('express'); 
var app = express(); 

// Creates a server which runs on port 3000 and 
// can be accessed through localhost:3000 
app.listen(3000, function() { 
	console.log('server running on port 3000'); 
} ) 

// Function callName() is executed whenever 
// url is of the form localhost:3000/name 
app.get('/name', callName); 

function callName(req, res) { 
	
	// Use child_process.spawn method from 
	// child_process module and assign it 
	// to variable spawn 
	var spawn = require("child_process").spawn; 
	
	// Parameters passed in spawn - 
	// 1. type_of_script 
	// 2. list containing Path of the script 
	// and arguments for the script 
	
	// E.g : http://localhost:3000/name?firstname=Mike&lastname=Will 
	// so, first name = Mike and last name = Will 
	var process = spawn('python',["./Energy.py", 
							req.query.firstname, 
							req.query.lastname] ); 

	// Takes stdout data from script which executed 
	// with arguments and send this data to res object 
	process.stdout.on('data', function(data) { 
		res.send(data.toString()); 
	} ) 
 } // END OF CODE SNIPPET 



    })
  });

});