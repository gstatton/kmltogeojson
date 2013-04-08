var tj = require("togeojson"),
	fs =  require("fs"),
	jsdom = require("jsdom").jsdom,
	multipart = require("multipart"),
	sys = require("sys"),
	express = require("express"),
    app = express(),
    https = require('https'),
    http = require('http');

app.use(express.json());
app.use(express.urlencoded());

app.use(express.bodyParser({uploadDir:'./uploads'}));

app.configure(function () {
  app.use(express.bodyParser());
  app.use(express['static'](__dirname));
  app.use(express.errorHandler({
    showStack: true,
    dumpExceptions: true
  }));
  app.use(app.router); 

});

app.configure(function(){
  app.use(express.static(__dirname + '/static'));
});


app.get('/', function(req, res){

  var items = [];
  var body = "";

  http.get(config, function(fetch) {



    fetch.on("data", function(chunk) {
      body+=chunk;
    });
    fetch.on("end", function() {
      simplexml.parse(body, function(e, parsed) {
        if(e){
          console.log("error");
        } else {
          items.push(parsed.channel.item)
        }

      });
        res.render('index', { items: items });

    });

  }).on('error', function(e) {
    console.log("Got error: " + e.message);
    res.render('index', { items: [] });
  });
    
});

app.get('/display', function(req, res){
  var items = [];
  var body = "";
  http.get(config, function(fetch) {
    // console.log("Got response: " + fetch.statusCode);
    fetch.on("data", function(chunk) {
      body+=chunk;
    });
    fetch.on("end", function() {
      simplexml.parse(body, function(e, parsed) {
        if(e){
          console.log("error");
        } else {
          items.push(parsed.channel.item)
        }
      });
        res.render('display', { items: items });
    });

  }).on('error', function(e) {
    console.log("Got error: " + e.message);
    res.render('display', { items: [] });
  });
   
});



app.post('/file-upload', function(req, res) {
    // get the temporary location of the file
    var tmp_path = req.files.kmlfile.path;
    console.log(tmp_path);

    var kml = jsdom(fs.readFileSync(tmp_path, 'utf8'));
	console.log("we are converting the file");
	var converted = tj.kml(kml);
	var converted_with_styles = tj.kml(kml, { styles: true });
	//console.log(converted);

	console.log(!(JSON.stringify(converted_with_styles)));

	var projName = req.body.projname;

	var contrivedObj = [];
	contrivedObj.push( { "projectName" : projName, "geoJSON": converted_with_styles });

	fs.writeFile('./uploads/converted.txt', JSON.stringify(contrivedObj), function (err) {
	  if (err) throw err;
	  console.log('It\'s saved!');
	});

	fs.unlink(tmp_path, function (err) {
  if (err) throw err;
  console.log('successfully deleted' + tmp_path);
});

var headers = {
  'Content-Type': 'application/json',
  'Content-Length': contrivedObj.length
};

var options = {
  host: 'localhost',
  port: 9200,
  path: '/geotagger/jobmaps/',
  method: 'POST',
  headers: headers
};

var req = http.request(options, function(res) {
  res.setEncoding('utf-8');

  var responseString = '';

  res.on('data', function(data) {
    responseString += data;
  });

  console.log("response String:" + JSON.parse(responseString));

  res.on('end', function() {
    var resultObject = JSON.parse(responseString);
  });
});


req.on('error', function(e) {
	console.log("error " + e);
});
console.log("posting data to API server...");
req.write(JSON.stringify(contrivedObj));
req.end();

res.send("file uploaded and converted!");

 });
	
app.listen(3000);