var tj = require("togeojson"),
	fs =  require("fs"),
	jsdom = require("jsdom").jsdom,
	http = require("http"),
	multipart = require("multipart"),
	sys = require("sys");

var server = http.createServer(function(req, res) {
  switch (require('url').parse(req.url).pathname) {
    case '/':
      display_form(req, res);
      break;
    case '/upload':
      upload_file(req, res);
      break;
    default:
      show_404(req, res);
      break;
  }
});

server.listen(8083);


function display_form(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(
'<!DOCTYPE html>' +
'<html>' +
'<head>' +
  '<meta charset="utf-8" />' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<link rel="stylesheet" type="text/css" href="css/jquery.mobile.flatui.css" />'+
  '<script src="js/jquery.min.js"></script>'+
  '<script src="js/jqm.min.js"></script>'+
  '<script src="js/togeojson.js"></script>'+
'</head>'+
'<body>'+
  '<div data-role="page">'+
    '<div data-role="header">'+
      '<a data-iconpos="notext" data-role="button" data-icon="home" title="Home">Home</a>'+
      '<h1>Convert your KML to GeoJSON!</h1>'+
      '<a data-iconpos="notext" data-role="button" data-icon="flat-menu"></a>'+
    '</div>'+
      
    '<form action="/upload" method="post" enctype="multipart/form-data">'+
      '<input type="file"  data-theme="a"  value="Select your KML file" />'+
      '<h1>Show On Map?</h1>'+
      '<select name="flip-1" id="flip-1"  data-theme="b" data-role="slider">'+
        '<option value="off">Off</option>'+
        '<option value="on" selected>On</option>'+
      '</select>'+
      '<input type="submit" value="Send">'+
    '</form>'+
  '</div>'+

  '<div id="highlight"> </div>'+
'</body>'+
'</html>'
  );
  res.end();
}

/*
 * Create multipart parser to parse given request
 */
function parse_multipart(req) {
    var parser = multipart.parser();

    // Make parser use parsed request headers
    parser.headers = req.headers;

    // Add listeners to request, transfering data to parser

    req.addListener("data", function(chunk) {
        parser.write(chunk);
    });

    req.addListener("end", function() {
        parser.close();
    });

    return parser;
}

/*
 * Handle file upload
 */
function upload_file(req, res) {
    // Request body is binary
    //req.setBodyEncoding("binary");

    // Handle request as multipart
    var stream = parse_multipart(req);

    var fileName = null;
    var fileStream = null;

    // Set handler for a request part received
    stream.onPartBegin = function(part) {
        sys.debug("Started part, name = " + part.name + ", filename = " + part.filename);

        // Construct file name
        fileName = "./uploads/" + stream.part.filename;

        // Construct stream used to write to file
        fileStream = fs.createWriteStream(fileName);

        // Add error handler
        fileStream.addListener("error", function(err) {
            sys.debug("Got error while writing to file '" + fileName + "': ", err);
        });

        // Add drain (all queued data written) handler to resume receiving request data
        fileStream.addListener("drain", function() {
            req.resume();
        });
    };

    // Set handler for a request part body chunk received
    stream.onData = function(chunk) {
        // Pause receiving request data (until current chunk is written)
        req.pause();

        // Write chunk to file
        // Note that it is important to write in binary mode
        // Otherwise UTF-8 characters are interpreted
        sys.debug("Writing chunk");
        fileStream.write(chunk, "binary");
    };

    // Set handler for request completed
    stream.onEnd = function() {
        // As this is after request completed, all writes should have been queued by now
        // So following callback will be executed after all the data is written out
        fileStream.addListener("drain", function() {
            // Close file stream
            fileStream.end();
            // Handle request completion, as all chunks were already written
            upload_complete(res);
        });
    };
}

function upload_complete(res) {
    sys.debug("Request complete");

    // Render response
    res.sendHeader(200, {"Content-Type": "text/plain"});
    res.write("Thanks for playing!");
    res.end();

    sys.puts("\n=> Done");
}


function show_404(req, res) {
  res.writeHeader(404, {'Content-Type': 'text/plain'});
  res.write('You r doing it rong!');
  res.end();
}

