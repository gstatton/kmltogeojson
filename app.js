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
  app.set('view engine', 'ejs');
  app.use(express.cookieParser()); 
  app.use(express.session({ secret: 'bsirocks' }));
  app.use(app.router); 
  // app.use(app.router);
});

app.configure(function(){
  app.use(express.static(__dirname + '/static'));
});

//app.get('/', function(req, res){
//  res.sendfile(__dirname + '/index.html');
//});

app.get('/', function(req, res){

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
        res.render('index', { items: items });

    });

  }).on('error', function(e) {
    console.log("Got error: " + e.message);
    res.render('index', { items: [] });
  });
  // pull the latest LinkShortner Stats to DashKu
  //dash.dashupdate();
    
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
  // pull the latest LinkShortner Stats to DashKu
  //dash.dashupdate();
    
});



app.post('/convert', function(req, res){
	fs.readFile(req.files.kmlfile.path, function (err, data) {
		console.log("we are reading the file...");

		console.log(data);
		
		var kml = jsdom(fs.readFileSync(data.path, 'utf8'));
		console.log("we are converting the file");
		var converted = tj.kml(kml);
		var converted_with_styles = tj.kml(kml, { styles: true });
		console.log(converted);
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

	//console.log("contrived object:");
	//console.log(contrivedObj);

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

var req = https.request(options, function(res) {
    console.log("statuscode: ", res.statuscode);
    console.log("headers: ", res.headers);
    res.setEncoding('utf8');
    res.on('data', function(d) {
        process.stdout.write(d);
    });
    res.on('end', function(){ // see http nodejs documentation to see end
        console.log("finished posting message");
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