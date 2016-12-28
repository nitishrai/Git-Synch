var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var os = require('os');
var Connection = require('ssh2');

var monk = require('monk');

var db = monk('mongodb://localhost:27017/nodetest1');

app.use(function(req, res, next) {
    req.db = db;
    next();
});

app.use('/src', express.static(__dirname + '/../src'));

app.use('/addons', express.static(__dirname + '/../addons'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/style.css', function(req, res) {
    res.sendFile(__dirname + '/style.css');
});

app.get('/main.js', function(req, res) {
    res.sendFile(__dirname + '/main.js');
});

app.ws('/bash', function(ws, req, res) {

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
            ws.send('\t\t\t\t\t\n\n\n\n\n\n\n\n\n\n\n\n\n\n'+'Database Not Connected1');
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
                        conn.shell(function(err, stream) {
                        
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
                                process.kill(conn.pid); //this makes terminal close..
                            });
                        });
                    });
                }
                catch(ex){
                    ws.send(ex);
            }

        });
    });
});
//automated:m07Q1CJ70LpMWm7L2y6y

var port = process.env.PORT || 3001,
    host = os.platform() === 'win32' ? '127.0.0.1' : 'localhost';

console.log('App listening to http://' + host + ':' + port);
app.listen(port, host);
