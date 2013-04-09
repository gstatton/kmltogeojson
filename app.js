var tj = require("togeojson"),
	fs =  require("fs"),
	jsdom = require("jsdom").jsdom,
	multipart = require("multipart"),
	sys = require("sys"),
	express = require("express"),
    app = express(),
    request = require('request');


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


app.get('.', function(req, res){

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

app.post('/mapmaking', function(req, res) {
    // get the temporary location of the file
    var tmp_path = req.files.kmlfile.path;
    console.log(tmp_path);

    var kml = jsdom(fs.readFileSync(tmp_path, 'utf8'));
	console.log("we are converting the file...");
	var converted_with_styles = tj.kml(kml, { styles: true });


	var converted = JSON.stringify(converted_with_styles);


	var projName = req.body.projname;

	var contrivedObj = { "projectName" : projName, "geoJSON": converted };


	fs.unlink(tmp_path, function (err) {
  if (err) throw err;
  console.log('successfully deleted' + tmp_path);
});


request.post({
  headers: {'content-type' : 'application/json'},
  url:     'http://localhost:9200/geotagger/jobmaps',
  body:    JSON.stringify( { "projectName" : projName, "geoJSON": converted } )
}, function(error, response, body){
  console.log("This is the body:  " + body);
  console.log("This is the response:  " + response);
  console.log("This is the error:  " + error);
});

var responseHTML = 
'<html lang="en">' +
  '<head>' +
    '<meta charset="utf-8">' +
    '<title>LogIT Map Creator</title>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +

    '<!-- Loading Bootstrap -->' +
    '<link href="css/bootstrap.css" rel="stylesheet">' +

    '<!-- Loading Flat UI -->' +
    '<link href="css/flat-ui.css" rel="stylesheet">' +
    '<link rel="shortcut icon" href="images/favicon.ico">' +

	  '<style>'+
      '#map-canvas {'+
        'width: 500px;'+
        'height: 400px;'+
     ' }'+
    '</style>'+
	'<script src="http://maps.googleapis.com/maps/api/js?sensor=false"></script>'+
   ' <script>'+
      'function initialize() {'+
        'var map_canvas = document.getElementById("map-canvas");'+
        'var map_options = {'+
          'center: new google.maps.LatLng(44.5403, -78.5463),'+
          'zoom: 8,'+
          'mapTypeId: google.maps.MapTypeId.ROADMAP'+
        '}'+
        'var map = new google.maps.Map(map_canvas, map_options)'+
      '}'+
      'google.maps.event.addDomListener(window, ‘load’, initialize);'+
    '</script>'+
	'</style>'+
  '</head>'+
  '<body>'+
    '<div class="container">'+
      '<div class="demo-headline">'+

        '<h1 class="demo-logo">'+
        '<div class="demo-illustrations"><img src="images/illustrations/retina.png" class="big-retina-illustration"></div>' +
         ' You Did It!!!'+
         ' <small>Your file is now loaded into the system...</small>'+
        '</h1>'+
      '</div> '+
      '<div class="map-load">'+

        '<div class="login-screen">'+
 //       '<div id="map-canvas"></div>'+



         ' </div>'+
     ' </div>'+

'</body>'+
'</html>'

res.send(responseHTML);
 });
	
app.listen(3000);
