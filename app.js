var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var fs = require('fs')
var bodyParser = require('body-parser');
var session = require('client-sessions');
var mongo = require('mongodb');
var compress = require('compression');
var busboyBodyParser = require('busboy-body-parser');
//var socket_io = require("socket.io");
var monk = require('monk');

var db = monk('mongodb://localhost:27017/nodetest1');

var app = express();
var asa = express();
var expressWs = require('express-ws')(asa);

var os = require('os');
var Connection = require('ssh2');

app.get('/main.js', function(req, res) {
    res.sendFile(__dirname + '/routes/main.js');
});

app.use(compress());
app.use(busboyBodyParser());
app.use(express.static(__dirname + '/public'));

app.post('/terminals/:pid/size', function (req, res) {
  var pid = parseInt(req.params.pid),
      cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      term = terminals[pid];

  term.resize(cols, rows);
  console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
  res.end();
});

app.get('/console1/:id', function(req, res) {
    var server_id = req.params.id;
    var ObjectID = require('mongodb').ObjectID;
    server_id = new ObjectID(server_id);
    var serverCollection = db.get('server');
    serverCollection.find({
        _id: server_id
    }, function(error, data) {
        if (error) {
            console.log('No Database Connection');
            return;
        }
        data.forEach(function(data) {
            res.render('console', {
                'server': req.params.id,
                'servername': data.server_identifier_name
            });
        });
    });
});

var routes = require('./routes/index');
var users = require('./routes/users');
//var gitapi = require('./routes/gitapi')(io);
var gitapi = require('./routes/gitapi');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(logger('dev', {
    skip: function(req,res,next) {
        if(req.url.indexOf('/console1/') == 0 ){ return res.statusCode < 305 ; }
    }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
    req.db = db;
    next();
});

app.use(session({
    cookieName: 'session',
    secret: 'a**',
    duration: 30 * 60 * 1000,
    activeDuration: 30 * 60 * 1000,
}));

app.use('/', routes);
app.use('/users', users);
app.use('/gitapi', gitapi);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// io.on("connection", function(socket) {
//     console.log("A user connected");
// });
// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

asa.use('/src', express.static(__dirname + '/../src'));

asa.use('/addons', express.static(__dirname + '/../addons'));

asa.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

asa.get('/style.css', function(req, res) {
    res.sendFile(__dirname + '/style.css');
});

asa.get('/main.js', function(req, res) {
    res.sendFile(__dirname + '/main.js');
});


asa.ws('/bash', function(ws, req, res) {

    var ObjectID = require('mongodb').ObjectID;
    var server = req.query.server;
    server = new ObjectID(server);
    var project_collection = db.get('project');
    var server_collection = db.get('server');
    var count;
    var project = {};
    project['branches'] = [];

    server_collection.find({
        _id: server
    }, function(err, serverdata) {
        if (err) {
            //sleep(1000);
            ws.send('\t\t\t\t\t\n\n\n\n\n\n\n\n\n\n\n\n\n\n'+'Database Not Connected');
            return;
        }

        serverdata.forEach(function(serverdata) {
            if (serverdata.auth_method == "key") {
                var auth_array_index = "privateKey";
            }
            if (serverdata.auth_method == "password") {
                var auth_array_index = "password";
            }

            var push_branch_array = {
                sshLogin: {
                    host: serverdata.host,
                    user: serverdata.username,
                    port: serverdata.port
                }
            }
            push_branch_array['sshLogin'][auth_array_index] = serverdata.auth_value;
            project.branches.push(push_branch_array);

            
            try {               
                    var conn = new Connection();
                    conn.connect(project.branches[0].sshLogin);
                    /**
                    * Open bash terminal and attach it
                    */
                    conn.on('ready', function() {
                        
                        conn.shell({term: 'xterm-256color', rows: 24, cols: 96 }, function(err, stream) {
                            
                            stream.on('data', function(data) {
                                try {
                                    ws.send('' + data);
                                } catch (ex) {
                                    ws.send(ex);
                                    // The WebSocket is not open, ignore
                                }
                            });
                            ws.on('message', function(msg) {
                                stream.write(msg);
                            });
                            ws.on('close', function() {
                                stream.end('exit');
                                conn.end();
                                console.log('close');
                                //process.kill(conn.pid); //this makes terminal close..
                            });
                        });
                    });
                    conn.on('error',function(err){
                        ws.send('\t\t\t\t\t\n\n\n\n\n\n\n\n\n\n\n\n\n\n'+err);
                    })
                }
                catch(ex){
                    ws.send(ex);
            }

        });
    });
});

var port1 =  3001,
    host = os.platform() === 'win32' ? '127.0.0.1' : 'localhost';

asa.listen(port1, host);

module.exports = app;