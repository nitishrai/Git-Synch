var express = require('express');
var router = express.Router();
var request = require('request');
var validator = require('validator');
var nodemailer = require('nodemailer');
var SSH = require('simple-ssh');
var MongoClient = require('mongodb').MongoClient;
var GitWebUrl = 'http://git.singsys.com/api/v3/';
//var multer = require('multer');
//var upload = multer();
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'noreply@singsys.com',
        pass: 'NoReplySingsys%1'
    }
});

var mongoDb;

/*function for gitproject
  pname = project_id or projectname case differs according to operations
*/
function gitApi(opp, pname, pid, group, webhook, req, res) {
    if (opp == "addProject") {
        var db = req.db;
        var gitProjectCollection = db.get('project');
        url = GitWebUrl + 'projects?name=' + pname + '&namespace_id=' + group + '&private_token=hNaPq1UPYBmzRkKK25yH';
        request.post(url, function(error, response, html) {
            if (response.statusCode != 404) {
                body = JSON.parse(response.body);
                gitProjectCollection.update({
                    'unique_identifier': body.name
                }, {
                    $set: {
                        'gitProjectId': body.id,
                        'namespaceId': body.namespace.id
                    }
                }, function(err, data) {
                    if (err) {
                        res.end('Database Not Connected.');
                        return 0;
                    }
                    if (data)
                        status = 'success';
                    else
                        status = 'fail';
                    res.redirect("projectedit/" + pname + '?status=' + status);
                });
            } else
                return false;
        });
    }
    if (opp == "addProjectWebHook") {

        urlHook = GitWebUrl + 'projects/' + pid + '/hooks/?private_token=hNaPq1UPYBmzRkKK25yH';
        request(urlHook, function(error, response, html) {
            if (error) {
                console.log('Error Has Occured' + error);
                return;
            } else {
                var htmlJson = JSON.parse(html);
                if (htmlJson.length > 0) {
                    htmlJson.forEach(function(htmlJson) {
                        var hookId = htmlJson.id;
                        urlEditHook = GitWebUrl + 'projects/' + pid + '/hooks/' + hookId + '?url=' + webhook + '&private_token=hNaPq1UPYBmzRkKK25yH';
                        request.put(urlEditHook, function(error, response, html) {
                            if (error) {
                                console.log('Error Has Occured' + error);
                                return;
                            }
                            res.redirect("projectedit/" + pname + '?status=' + response.statusCode);
                        });
                    })
                } else {
                    url = GitWebUrl + 'projects/' + pid + '/hooks?url=' + webhook + '&private_token=hNaPq1UPYBmzRkKK25yH';
                    request.post(url, function(error, response, html) {
                        if (error) {
                            console.log('Error Has Occured' + error);
                            return;
                        }
                        res.redirect("projectedit/" + pname + '?status=' + response.statusCode);
                    });
                }
            }
        });
    }
}


//get project id from git
router.get('/getWebhook/:opp', function(req, res) {
    if (req.params.opp == "getProjectId") {
        url = GitWebUrl + 'projects/search/' + req.query.unique_identifier + '?private_token=hNaPq1UPYBmzRkKK25yH';
        request(url, function(error, response, html) {
            if (error) {
                res.send(error)
                res.json({
                    'status': 'fail',
                    'data': 'There is problem in connecting to Server Please Try Again'
                });
                return;
            }
            id = '';
            if (response.statusCode == 401) {
                res.json({
                    'status': 'fail',
                    'data': 'Unauthorised Access'
                });
                return;
            }
            if (response.statusCode != 404) {
                html = JSON.parse(html);
                html.forEach(function(html) {
                    id += html.name + '(' + html.id + ',' + html.namespace.name + ')' + " ";
                });
            }
            if (id == "")
                id = "No Project Found in Git";
            res.json({
                'status': 'success',
                'data': id
            });
        });
    } else if (req.params.opp == "getProjectHook") {
        urlHook = GitWebUrl + 'projects/' + req.query.unique_identifierId + '/hooks/?private_token=hNaPq1UPYBmzRkKK25yH';
        request(urlHook, function(error, response, html) {
            if (error) {
                console.log('Error Has Occured' + error);
                var data = error;
            } else
                var data = html;
            return data;
        });
    } else {
        res.json({
            'status': 'fail',
            'data': 'Invalid arguments supplied'
        });
    }
});


//login page
router.get('/login', function(req, res, next) {
    if (req.session.user) {
        res.redirect('projectlist');
    } else {
        res.render('login');
    }
});


//gitlab login
router.get('/gitlogin', function(req, res) {

    res.render('gitlogin');
});


//gitresult data
router.get('/success', function(req, res) {

    //res.send(req.query.code);
    var url = 'http://git.singsys.com/oauth/token?client_id=3b40b8664d2cb36a531992c895477c1722ddac5b14efb30dcd7b3fd56fc0b46e&client_secret=aa7e00303b70d186526a528561f7be3f078e83aca55118f465fe2923f862597c&code=' + req.query.code + '&grant_type=password&redirect_uri=http://localhost:3030/logindata';
    console.log(url);
    request.post(url, function(error, response, html) {
        console.log(html);
    });

});


router.get('/logindata', function(req, res) {
    console.log(req.query);
});


//git command form
router.get('/command', function(req, res) {
    res.render('command');
});


//sign out from session
router.get('/signout', function(req, res) {
    count = 0;
    if (count == 0) {
        req.session.destroy();
        count++;
    }
    if (count == 1)
        res.redirect('/login');
});

//login check
router.post('/logincheck', function(req, res) {

    var username = req.body.login_name;
    var password = req.body.password;
    user_name = 'admin';
    pass_word = 'Git%2016';
    if (user_name == username && pass_word == password) {
        req.session.user = user_name;
        res.redirect('/projectlist');
    } else {
        res.redirect('/login');
    }
});


//function to check that the login is valid or not by maintaing session
function loginverify(req, res, next) {
    if (!req.session.user) {
        res.redirect('/login');
    } else
        next();
}


// to add a new project
router.get('/newproject', loginverify, function(req, res) {
    res.render('newproject', {
        title: 'Add New Project'
    });
});


//test
//router.get('/test', upload.fields(), function(req, res) {
//    res.render('test', {
//        title: 'Add New Project'
//    });
//});

//router.post('/test1', upload.fields(), function(req, res) {
//    console.log(req.files);
//});

//to add a new server
router.get('/newserver', loginverify, function(req, res) {
    res.render('newserver', {
        title1: 'Add New server'
    });
});


//project Edit form
router.get('/projectedit/:_id', loginverify, function(req, res) {

    var project_id = req.params._id;
    var db = req.db;
    status = '';
    message = '';
    var checkStatus = req.query.status;
    var collection = db.get('project');
    collection.count({
        'unique_identifier': project_id
    }, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        if (data) {
            collection.find({
                'unique_identifier': project_id
            }, function(err, data) {
                if (err) {
                    res.status(404).send('Database Not Connected.');
                    return;
                }
                if (req.query.status) {
                    if (checkStatus == 'success' || checkStatus == 201 || checkStatus == 200) {
                        status = 'success';
                        message = 'Your Changes Has Been Updated Successfully';
                    } else if (checkStatus == 'danger' || checkStatus == 404 || checkStatus == 400) {
                        status = 'danger';
                        message = 'Error Updating Changes';
                    }
                }
                res.render('projectedit', {
                    'project': data,
                    'status': status,
                    'message': message
                });
            });
        } else {
            res.status(404).send('Project Does Not Exist');
        }
    });
});


//branch add form
router.get('/branchadd/:_id', loginverify, function(req, res) {

    var project_id = req.params._id;
    var db = req.db;
    var project_collection = db.get('project');
    var collection = db.get('server');
    project_collection.count({
        'unique_identifier': project_id
    }, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        if (data) {
            project_collection.find({
                'unique_identifier': project_id
            }, function(err, projectData) {
                if (err) {
                    res.status(404).send('Database Not Connected.');
                    return;
                }
                projectData.forEach(function(projectData) {
                    collection.find({}, {
                        'auth_value': 1
                    }, function(err, serverdata) {
                        if (err) {
                            res.status(404).send('Database Not Connected.');
                            return;
                        }
                        if (projectData.gitProjectId) {
                            res.render('branchadd', {
                                'project_id': project_id,
                                'branchDetails': projectData,
                                'server': serverdata,
                                'gitProjectId': projectData.gitProjectId
                            });
                        } else {
                            res.render('branchadd', {
                                'project_id': project_id,
                                'server': serverdata
                            });
                        }
                    });
                })
            });
        } else {
            res.send('404 Error Page Not Found', 404);
        }
    });
});


//branch details fetch page
router.get('/branchdetails/:_id', loginverify, function(req, res) {

    branchArray = {};
    branchArray['branchData'] = [];
    project_id = req.params._id;
    var db = req.db;
    var i = 0;
    var branchdata = [];
    ObjectID = require('mongodb').ObjectID;
    var collection = db.get('project');
    server_collection = db.get('server');
    collection.find({
        'unique_identifier': project_id
    }, {}, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        data.forEach(function(data) {
            if ((data.branches.length > 0)) {
                var count = data.branches.length;
                check = 2 * count;
                data.branches.forEach(function(bData) {
                    var server_id = new ObjectID(bData.servername);
                    server_collection.find({
                        _id: bData.servername
                    }, function(err, sData) {
                        if (err) {
                            res.status(404).send('Database Not Connected.');
                            return;
                        }
                        sData.forEach(function(sData) {
                            var pathSplit = bData.pathonserver.split("/");
                            var resLength = pathSplit.length;
                            dataArray = {
                                branchname: bData.branchname,
                                branch_id: bData.branch_id,
                                web_url: sData.web_path_prefix + '/' + pathSplit[resLength - 1],
                                friendlyservername: bData.friendlyservername,
                            }
                            count++;
                            branchArray.branchData.push(dataArray);
                            if (check == count) {
                                res.render('branchdetails', {
                                    'data': branchArray.branchData
                                });
                            }
                        });
                    });
                });
            } else {
                data.branches = [];
                res.render('branchdetails', {
                    'data': data.branches
                });
            }
        });
    });
});


//show project list
router.get('/projectlist', loginverify, function(req, res) {

    projectListArray = {};
    projectListArray['countProject'] = [];
    detailProjectArray = {
        branch: []
    };
    detailProjectArray['branch'] = [];
    var db = req.db;
    var collection = db.get('project');
    collection.find({}, {}, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected1.');
            return;
        }
        data.forEach(function(cData) {
            detailProjectArray = {
                id: cData._id,
                unique_identifier: cData.unique_identifier,
                branchLength: cData.branches.length,
                branch: []
            };
            cData.branches.forEach(function(bData) {
                var br = {
                    'bname': bData.branchname,
                    'web_url': bData.web_url
                };
                detailProjectArray.branch.push(br);
            });
            projectListArray.countProject.push(detailProjectArray);
        });
        res.render('projectlist', {
            'projects': projectListArray.countProject
        });
    });
});


//search project
router.get('/searchproject', loginverify, function(req, res) {

    projectListArray = {};
    projectListArray['countProject'] = [];
    detailProjectArray = {
        branch: []
    };
    detailProjectArray['branch'] = [];
    key = '';
    if (req.query.key) {
        key = req.query.key;
    }
    if (chck) {
        var db = req.db;
        var collection = db.get('project');
        collection.find({
            'unique_identifier': {
                '$regex': key
            }
        }, {}, function(err, data) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            data.forEach(function(cData) {
                detailProjectArray = {
                    id: cData._id,
                    unique_identifier: cData.unique_identifier,
                    branchLength: cData.branches.length,
                    branch: []
                };
                cData.branches.forEach(function(bData) {
                    var br = {
                        'bname': bData.branchname,
                        'web_url': bData.web_url
                    };
                    detailProjectArray.branch.push(br);
                });
                projectListArray.countProject.push(detailProjectArray);
            });
            res.json(projectListArray.countProject);
        });
    }
});


//search server
router.get('/searchserver', loginverify, function(req, res) {

    key = '';
    if (req.query.key) {
        key = req.query.key;
    }
    var server = {};
    server['count'] = [];
    var db = req.db;
    var server_collection = db.get('server');
    var project_collection = db.get('project');
    server_collection.find({
        'server_identifier_name': {
            '$regex': key
        }
    }, {}, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        data.forEach(function(data1) {
            ar = {
                'server_identifier_name': data1.server_identifier_name,
                '_id': data1._id,
                'host': data1.host
            }
            server.count.push(ar);
        });
        res.json(server.count);
    });
});


//fetch serverdata ajax call
router.get('/fetchserver', loginverify, function(req, res) {

    var servername = req.query.servername;
    var ObjectID = require('mongodb').ObjectID;
    var server_id = new ObjectID(servername);
    var db = req.db;
    var server_collection = db.get('server');
    server_collection.find({
        _id: server_id
    }, function(err, data) {
        if (err) throw err;
        data.forEach(function(data) {
            res.json(data.web_path_prefix);
        });
    });
});


//show server list
router.get('/serverlist', loginverify, function(req, res) {

    var ObjectID = require('mongodb').ObjectID;
    var MongoClient = require('mongodb').MongoClient;
    var server = {};
    server['count'] = [];
    var db = req.db;
    var server_collection = db.get('server');
    var project_collection = db.get('project');
    server_collection.find({}, {}, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        data.forEach(function(data1) {
            var s_id = new ObjectID(data1._id);
            ar = {
                'server_identifier_name': data1.server_identifier_name,
                '_id': data1._id,
                'host': data1.host
            }
            server.count.push(ar);
        });
        res.render('serverlist', {
            "server": server.count
        });
    });
});


//editing the given project
router.get('/projectview/:_id', loginverify, function(req, res) {

    var id = req.params._id;
    var db = req.db;
    var collection = db.get('server');
    var check_project_id = validator.isMongoId(id);
    if (check_project_id) {
        collection.find({}, {}, function(err, serverdata) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            res.render('projectview', {
                title: 'Add New Project',
                "server": serverdata,
                "project_id": id
            });
        });
    } else
        res.send('404 Page Not Found', 404);
});


//getting the dashboard for project where branch can be added or deleted
router.get('/projectinfo/:_id', loginverify, function(req, res) {

    var unique_identifier = req.params._id;
    var db = req.db;
    var collection = db.get('project');
    collection.count({
        'unique_identifier': unique_identifier
    }, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        if (data)
            res.render('projectinfo', {
                'project_id': unique_identifier
            });
        else
            res.send('Project Not Found', 404);
    });
});


//viewing the server data
router.get('/serverview/:_id', loginverify, function(req, res) {

    var server_id = req.params._id;
    var db = req.db;
    var collection = db.get('server');
    collection.find({
        'server_identifier_name': server_id
    }, {}, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        if ((Object.keys(data).length) > 0)
            res.render('serverview', {
                'serverdata': data
            });
        else
            res.status(404).send('Oops this Server Does not Exist');
    });
});


//saving the updated server details
router.post('/updateserver', function(req, res) {

    var server_id = req.body.server_id;
    var server_identifier_name = req.body.server_identifier_name;
    var host = req.body.hostip;
    var port = req.body.portno;
    var username = req.body.username;
    var authkey = req.body.auth_value;
    var authmethod = req.body.authmethod;
    var web_path_prefix = req.body.web_path_prefix;
    if (web_path_prefix == "") {
        web_path_prefix = 'http://' + host;
    }
    if (authmethod == 1) {
        auth_method = "key";
    }
    if (authmethod == 2) {
        auth_method = "password";
    }

    var db = req.db;
    var collection = db.get('server');

    var check_server_identifier_name = (/^[a-z0-9\_-]{3,60}$/).test(server_identifier_name);
    var check_host = validator.isIP(host) || validator.isURL(host);
    var check_port = validator.isNumeric(port);
    var check_username = (/^[a-zA-Z0-9\_-]{3,30}$/).test(username);
    var check_authmethod = validator.isNull(authmethod);
    var check_authkey = validator.isNull(authkey);
    var check_web_path_prefix = validator.isURL(web_path_prefix) || web_path_prefix == "";

    if (!check_authkey && !check_authmethod && check_server_identifier_name && check_host && check_port && check_username && check_web_path_prefix) {
        collection.update({
            'server_identifier_name': server_id
        }, {
            'server_identifier_name': server_identifier_name,
            'web_path_prefix': web_path_prefix,
            'host': host,
            'port': port,
            'username': username,
            'auth_method': auth_method,
            'auth_value': authkey
        }, function(err, data) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            res.redirect('serverlist');
        });
    } else {
        res.send('You Entered Incorrect Data');
    }
});


//displaying the details of the given edit branch
router.get('/branchedit/:_id', loginverify, function(req, res) {

    var branch_id = req.params._id;
    var MongoClient = require('mongodb').MongoClient;

    var db1 = req.db;
    var collection = db1.get('server');

    var ObjectID = require('mongodb').ObjectID;
    var _id = new ObjectID(branch_id);
    MongoClient.connect('mongodb://localhost:27017/nodetest1', function(err, db) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        var col = db.collection('project');
        col.aggregate([{
            $match: {
                'branches.branch_id': _id
            }
        }, {
            "$unwind": "$branches"
        }, {
            $match: {
                'branches.branch_id': _id
            }
        }], function(err, result) {
            result.forEach(function(result) {
                servername = result.branches.servername;
                server_id = new ObjectID(servername);
            });
            collection.find({}, {}, function(err, serverdata) {
                if (err) {
                    res.status(404).send('Database Not Connected.');
                    return;
                }
                collection.find({
                    _id: server_id
                }, function(err, data) {
                    if (err) {
                        res.status(404).send('Database Not Connected.');
                        return;
                    }
                    res.render('branchedit', {
                        'branchdata': result,
                        'server': serverdata,
                        'servern': data
                    });
                    db.close();
                });
            });
        });
    });
});


//updating a branch details
router.post('/updatebranch', function(req, res) {
    var db = req.db;
    var project_id = req.body.project_id;
    branch_id = req.body.branch_id;
    branchname = req.body.branchname;
    pathonserver = req.body.pathonserver;
    friendlyservername = req.body.friendlyservername;
    servername = req.body.servername;
    web_url = req.body.web_url;
    dbarray = [];
    if (req.body.dbpresent) {
        dbarray = {
            'db_url': req.body.db_url,
            'db_name': req.body.db_name,
            'db_username': req.body.db_username,
            'db_password': req.body.db_password
        }
    }

    var ObjectID = require('mongodb').ObjectID;
    b_id = new ObjectID(branch_id);

    var check_branchname = (/^[a-z0-9\_-]{3,30}$/).test(branchname);
    var check_pathonserver = (/^[a-zA-Z0-9\/_-]{3,200}$/).test(pathonserver);
    var check_friendlyservername = (/^[a-zA-Z0-9\_ -]{3,60}$/).test(friendlyservername);
    var check_servername = validator.isNull(servername);
    var check_web_url = validator.isURL(web_url);

    var collection = db.get('project');

    if (!check_servername && check_friendlyservername && check_pathonserver && check_branchname && check_web_url) {
        collection.update({
                'branches.branch_id': b_id
            }, {
                "$set": {
                    'branches.$.branchname': branchname,
                    'branches.$.pathonserver': pathonserver,
                    'branches.$.friendlyservername': friendlyservername,
                    'branches.$.web_url': web_url,
                    'branches.$.servername': servername,
                    'branches.$.database': dbarray
                }
            },
            function(err, data) {
                if (err) {
                    res.status(404).send('Database Not Connected.');
                    return;
                }
                res.redirect('/branchdetails/' + project_id);
            });
    } else {
        res.send('You Entered The Incorrect Data');
    }
});


//deleting a  given branch
router.get('/branchdelete/:_id', loginverify, function(req, res) {

    var branch_id = req.params._id;
    var db = req.db;
    var collection = db.get('project');
    var ObjectID = require('mongodb').ObjectID;
    var _id = new ObjectID(branch_id);
    collection.update({
        'branches.branch_id': _id
    }, {
        $pull: {
            "branches": {
                'branch_id': _id
            }
        }
    }, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        res.redirect('back');
    });
});


//checking for unique project name
router.get('/uniqueproject', loginverify, function(req, res) {

    var identifier = req.query.unique_identifier;
    var db = req.db;
    var collection = db.get('project');
    collection.count({
        unique_identifier: identifier
    }, function(err, countdata) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        res.json({
            isavailable: (countdata > 0 ? false : true)
        });
    });
});


//checking for unique servername
router.get('/serverunique', loginverify, function(req, res) {

    var identifier = req.query.unique_identifier;
    var db = req.db;
    var collection = db.get('server');
    collection.count({
        server_identifier_name: identifier
    }, function(err, countdata) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        res.json({
            isavailable: (countdata > 0 ? false : true)
        });
    });
});


//add new project
router.post('/addproject', function(req, res) {
    var db = req.db;
    var unique_identifier = req.body.unique_identifier;
    var email = req.body.email;
    var git_url = req.body.git_url;
    var group = req.body.group;
    var namespace_id;
    if (group == "php") {
        namespace_id = 106;
    }
    if (group == "systems") {
        namespace_id = 189;
    }
    if (group == "html-design")
        namespace_id = 110;

    var collection = db.get('project');
    var emailCollection = db.get('email');
    var check_unique_identifier = (/^[a-z0-9\_-]{3,60}$/).test(unique_identifier);
    var check_email = validator.isEmail(email);
    var check_git_url = validator.isURL(git_url);
    if (check_email) {
        emailCollection.count({
            'email': email
        }, function(err, countEmailData) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            if (countEmailData == 0) {
                emailCollection.insert({
                    'email': email
                }, function(err, doc) {
                    if (err) {
                        res.status(404).send('Database Not Connected.');
                        return;
                    }
                    console.log('Email Inserted to Collection');
                });
            }
        });
    }
    if (check_email && check_unique_identifier && check_git_url) {
        collection.count({
            unique_identifier: unique_identifier
        }, function(err, countdata) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            if (!countdata) {
                collection.insert({
                    "unique_identifier": unique_identifier,
                    "git_url": git_url,
                    "group": group,
                    "email": email,
                    "branches": [],
                    "date_added": new Date()
                }, function(err, doc) {
                    if (err) {
                        res.send("There was a problem adding the information to the database.");
                        return;
                    } else {
                        if (req.body.gitProjectAdd) {
                            gitApi('addProject', unique_identifier, '', namespace_id, '', req, res);
                        } else {
                            res.redirect("projectedit/" + unique_identifier);
                        }
                    }
                });
            } else {
                res.status(404).send('404 Project Already Exist');
            }
        });
    } else {
        res.send('Incorrect Data Entered');
    }
});


//delete project
router.get('/projectdelete/:_id', loginverify, function(req, res) {

    var project_id = req.params._id;
    var db = req.db;
    var project_collection = db.get('project');
    project_collection.remove({
        'unique_identifier': project_id
    }, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        res.redirect("/projectlist");
    });
});


//update project info
router.post('/updateproject', function(req, res) {
    var project_id = req.body.project_id;
    var unique_identifier = req.body.unique_identifier;
    var email = req.body.email;
    var git_url = req.body.git_url;
    var group = req.body.group;
    var webhook = req.body.webhook;
    var db = req.db;
    var collection = db.get('project');
    collection.update({
        'unique_identifier': project_id
    }, {
        $set: {
            'email': email,
            'unique_identifier': unique_identifier,
            'git_url': git_url,
            'group': group
        }
    }, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        if (req.body.gitProjectId && req.body.gitProjectId != "undefined") {
            gitApi('addProjectWebHook', unique_identifier, req.body.gitProjectId, req.body.namespaceId, req.body.webhook, req, res);
        } else {
            res.redirect('projectinfo/' + unique_identifier);
        }
    });
});


//saving new branch
router.post('/addbranch', function(req, res) {
    //console.log(req.body);
    var db = req.db;
    var project_id = req.body.project_id;
    var branchname = req.body.branchname;
    var pathonserver = req.body.pathonserver;
    var friendlyservername = req.body.friendlyservername;
    var servername = req.body.servername;
    var web_url = req.body.web_url;
    var runuser = req.body.runuser;

    var check_branchname = (/^[a-z0-9\_-]{3,30}$/).test(branchname);
    var check_pathonserver = (/^[a-zA-Z0-9\/_.-]{3,200}$/).test(pathonserver);
    var check_friendlyservername = (/^[a-zA-Z0-9\_ -]{3,30}$/).test(friendlyservername);
    var check_servername = validator.isNull(servername);
    var check_web_url = validator.isURL(web_url);

    dbarray = [];
    if (req.body.dbpresent) {
        var dbarray = {
            'db_url': req.body.db_url,
            'db_name': req.body.db_name,
            'db_username': req.body.db_username,
            'db_password': req.body.db_password
        };
    }

    var collection = db.get('project');
    var server_collection = db.get('server');

    if (check_branchname && check_friendlyservername && check_pathonserver && !check_servername && check_web_url) {
        var ObjectID = require('mongodb').ObjectID;
        var server_id = new ObjectID(servername);
        var branch_id = new ObjectID();

        server_collection.count({
            _id: server_id
        }, function(err, data) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            if (!data)
                res.status(404).send('Please Select A Valid Server');
            else {
                var brancharray = {
                    'branch_id': branch_id,
                    'branchname': branchname,
                    'pathonserver': pathonserver,
                    'friendlyservername': friendlyservername,
                    'web_url': web_url,
                    'servername': server_id,
                    'runuser': runuser,
                    'database': dbarray
                };
                collection.update({
                    'unique_identifier': project_id
                }, {
                    $push: {
                        'branches': brancharray
                    }
                }, function(err, data) {
                    if (err) {
                        res.status(404).send('Database Not Connected.');
                        return;
                    }
                    if (req.body.makeDirectory && req.body.gitProjectId) {
                        gitProjectFolder(branch_id, server_id, 'makeDirectory', '', req, res);
                    }
                    if (req.body.createBranchFrom && req.body.gitProjectId) {
                        // Creating branch to git using git api
                        if (req.body.createBranchFrom) {
                            url = GitWebUrl + 'projects/' + req.body.gitProjectId + '/repository/branches?branch_name=' + branchname + '&ref=' + req.body.createBranchFrom + '&private_token=hNaPq1UPYBmzRkKK25yH';
                            request.post(url, function(error, response, html) {
                                if (error) {
                                    var optionsGitError = {
                                        uri: "https://hooks.slack.com/services/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",
                                        form: '{"attachments":[{"fallback":"Git Login Error[' + project_id + ']","pretext":"Git Branch Create Error[' + project_id + ']","color":"danger","fields":[{"title":"Branch","value":"' + branchname + '","short":false},{"title":"Error Message`","value":"```' + error + '```","short":false}],"mrkdwn_in": ["text","pretext","fields"]}],"channel": "#git-error","parse":"none"}'
                                    };

                                    request.post(optionsGitError, function(error, response, html) {
                                        console.log(html);
                                        return 1;
                                    });
                                } else {
                                    gitProjectFolder(branch_id, server_id, "makeDirectory", req.body.createBranchFrom, req, res);
                                }
                                //console.log(html);
                                //html1 = JSON.parse(html);
                            });
                        }
                    }
                    res.redirect('/branchdetails/' + project_id);
                });
            }
        });
    } else {
        res.send('You have Entered The Incorrect Data');
    }
});


//function for git project directory
function gitProjectFolder(branch_id, server_id, operation, createBranchFrom, req, res) {
    var db = req.db;
    var serverCollection = db.get('server');
    var ObjectID = require('mongodb').ObjectID;
    var s_id = new ObjectID(server_id);
    var b_id = new ObjectID(branch_id);
    /*
      folder creation plus create clone of a project
    */
    if (operation == "makeDirectory") {
        MongoClient.connect('mongodb://localhost:27017/nodetest1', function(err, db) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            var auth_array_index;
            var projectCollection = db.collection('project');
            projectCollection.aggregate([{
                $match: {
                    'branches.branch_id': b_id
                }
            }, {
                "$unwind": "$branches"
            }, {
                $match: {
                    'branches.branch_id': b_id
                }
            }], function(err, result) {
                result.forEach(function(result) {
                    serverCollection.find({
                        '_id': s_id
                    }, {}, function(err, sData) {

                        sData.forEach(function(sData) {

                            if (sData.auth_method == "key") {
                                auth_array_index = "key";
                            }
                            if (sData.auth_method == "password") {
                                auth_array_index = "pass";
                            }
                            arr = {
                                host: sData.host,
                                user: sData.username,
                                port: sData.port,
                            };
                            arr[auth_array_index] = sData.auth_value;

                            execute();
                            var count = 0;
                            checkModule = function() {
                                if (count < 3) {
                                    count++;
                                    execute();
                                }
                            }

                            function execute() {
                                var ssh = new SSH(arr);
                                var currentDirectoryTraverse = result.branches.pathonserver.substr(0, result.branches.pathonserver.lastIndexOf("/"));
                                var createDirectory = result.branches.pathonserver.substring(result.branches.pathonserver.lastIndexOf("/") + 1);
                                var output;
                                var errorMessage;
                                var command = 'cd "' + currentDirectoryTraverse + '" && mkdir ' + createDirectory + ' && cd ' + createDirectory + ' && echo "This is ' + result.branches.branchname + ' branch of ' + result.unique_identifier + '" > index.php && git init && git add --all && git commit -m "First Commit from Server" && git branch -m ' + result.branches.branchname + ' && git remote add origin http://automated:m07Q1CJ70LpMWm7L2y6y@git.singsys.com/' + result.group + '/' + result.unique_identifier + '.git && git push origin ' + result.branches.branchname + ' -u';
                                if (createBranchFrom) {
                                    var command = 'cd "' + currentDirectoryTraverse + '" && git clone -b ' + result.branches.branchname + ' http://automated:m07Q1CJ70LpMWm7L2y6y@git.singsys.com/' + result.group + '/' + result.unique_identifier + '.git ' + createDirectory;
                                }
                                console.log(command);
                                try {
                                    ssh.exec(command, {
                                        out: function(stdout) {
                                            output += stdout;
                                            console.log('std' + stdout);
                                            count = 3;
                                        },
                                        err: function(stderr) {
                                            hasError = true;
                                            errorMessage += stderr;
                                            console.log(errorMessage);
                                        },
                                        exit: function(exitCode) {
                                            if (exitCode != 0) {
                                                var options1 = {
                                                    uri: "https://hooks.slack.com/services/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",
                                                    form: '{"attachments":[{"fallback":"Git Error While Making Directory[' + result.unique_identifier + ']","pretext":"Git Error While Making Directory[' + result.unique_identifier + ']","color":"danger","fields":[{"title":"Error Message","value":"```' + errorMessage + '```","short":false}],"mrkdwn_in": ["text","pretext","fields"]}],"channel": "#git-error","parse":"none"}'
                                                };

                                                request.post(options1, function(error, response, html) {
                                                    console.log('slack message added: ' + html);
                                                    return 1;
                                                });
                                                db.close();
                                            } else {
                                                var options1 = {
                                                    uri: "https://hooks.slack.com/services/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",
                                                    form: '{"attachments":[{"fallback":"Git Directory Successfully Created[' + result.unique_identifier + ']","pretext":"Git Directory Successfully Created[' + result.unique_identifier + ']","color":"danger","fields":[{"title":"Output","value":"```' + output + '```","short":false,"mrkdwn_in":true}],"mrkdwn_in": ["text","pretext","fields"]}],"channel": "#git-error","parse":"none"}'
                                                };
                                                request.post(options1, function(error, response, html) {
                                                    console.log(html);
                                                    return 1;
                                                });
                                            }
                                        }
                                    }).start();
                                } catch (ex) {
                                    console.log('Error' + ex);
                                }
                                ssh.on('error', function(err) {
                                    console.log(err);
                                    if (count == 2) {
                                        var options1 = {
                                            uri: "https://hooks.slack.com/services/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",
                                            form: '{"attachments":[{"fallback":"Git Error Login[Urgent]","pretext":"Git Error While Making Directory[' + result.unique_identifier + ']","color":"danger","fields":[{"title":"Error Message","value":"```' + err + '```","short":false,"mrkdwn_in":true}],"mrkdwn_in": ["text","pretext","fields"]}],"channel": "#git-error","parse":"none"}'
                                        };
                                        request.post(options1, function(error, response, html) {
                                            console.log(html);
                                            return 1;
                                        });
                                        db.close();
                                    } else
                                        checkModule();
                                    ssh.end();
                                });
                            }
                        });
                    });
                });
            });
        });
    }
}


// adding a new server
router.post('/addserver', function(req, res) {
    var db = req.db;
    var unique_identifier = req.body.unique_identifier;
    var host = req.body.hostip;
    var web_path_prefix = req.body.web_path_prefix;
    if (web_path_prefix == "") {
        web_path_prefix = 'http://' + host;
    }
    var port = req.body.portno;
    var username = req.body.username;
    var authmethod = req.body.authmethod;
    var auth_method;
    var authkey;

    if (authmethod == 1) {
        auth_method = "key";
        authkey = req.body.key;
    }
    if (authmethod == 2) {
        auth_method = "password";
        authkey = req.body.password;
    }

    var check_unique_identifier = (/^[a-z0-9\_-]{3,30}$/).test(unique_identifier);
    var check_host = validator.isIP(host) || validator.isURL(host);
    var check_port = validator.isNumeric(port);
    var check_username = (/^[a-zA-Z0-9\_-]{3,30}$/).test(username);
    var check_authmethod = validator.isNull(authmethod);
    var check_authkey = validator.isNull(authkey);
    var check_web_path_prefix = validator.isURL(web_path_prefix) || web_path_prefix == "";

    var collection = db.get('server');

    if (!check_authkey && !check_authmethod && check_username && check_port && check_host && check_unique_identifier) {
        collection.count({
            "server_identifier_name": unique_identifier
        }, function(err, count) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            if (!count) {
                collection.insert({
                    "server_identifier_name": unique_identifier,
                    "host": host,
                    "web_path_prefix": web_path_prefix,
                    "port": port,
                    "username": username,
                    "auth_method": auth_method,
                    "auth_value": authkey,
                    "date_added": new Date()
                }, function(err, doc) {
                    if (err) {
                        res.send("There was a problem adding the information to the database.");
                        return;
                    } else {
                        res.redirect("projectlist");
                    }
                });
            } else {
                res.send('Server Already Exist');
            }
        });
    } else {
        res.send('You Entered Incorrect Data');
    }
});


//adding a user
router.post('/adduser', function(req, res) {
    var db = req.db;

    var projectname = req.body.projectname;
    var servername = req.body.servername;
    var localpath = req.body.localpath;

    var collection = db.get('usercollection');
    collection.insert({
        "projectname": projectname,
        "servername": servername,
        "localpath": localpath
    }, function(err, doc) {
        if (err) {
            res.send("There was a problem adding the information to the database.");
            return;
        } else {
            res.redirect("userlist");
        }
    });
});

//git branch detail fetch synch file
router.all('/', function(req, res, next) {
    var appName = req.query.app;
    if (!appName) {
        throw new Error('Application name could not be found.');
    };
    var db = req.db;
    var project = {};
    project['branches'] = [];
    var project_collection = db.get('project');
    var server_collection = db.get('server');
    var obj1 = new Object();
    var count;
    project_collection.count({
        'unique_identifier': appName
    }, function(err, countdata) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        if (countdata == 0) {
            res.status(500).send({
                error: 'Oops Project Does Not Exist!'
            });
        }
    });
    project_collection.find({
        'unique_identifier': appName
    }, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        data.forEach(function(projectobject) {
            count = projectobject.branches.length;
            check_count = count + count;
            projectobject.branches.forEach(function(branch) {
                server_collection.find({
                    _id: branch.servername
                }, function(err, serverdata) {
                    if (err) {
                        res.status(404).send('Database Not Connected.');
                        return;
                    }
                    serverdata.forEach(function(serverdata) {
                        count++;
                        if (serverdata.auth_method == "key") {
                            var auth_array_index = "key";
                        }
                        if (serverdata.auth_method == "password") {
                            var auth_array_index = "pass";
                        }
                        var push_branch_array = {
                            name: branch.branchname,
                            serverName: branch.friendlyservername,
                            localPath: branch.pathonserver,
                            sshLogin: {
                                host: serverdata.host,
                                user: serverdata.username,
                                port: serverdata.port
                            }
                        };
                        if (branch.runuser != null || branch.runuser != undefined) {
                            push_branch_array['runuser'] = branch.runuser;
                        }
                        push_branch_array['sshLogin'][auth_array_index] = serverdata.auth_value;
                        project.branches.push(push_branch_array);
                        if (count == check_count) {
                            syncProject(project, appName, req);
                            res.render('index', {
                                title: 'Express'
                            });
                        }
                    });
                });
            });
        });
    });
});


//email details form for project
router.get('/projectemail/:_id', function(req, res) {
    var project_id = req.params._id;
    res.render('projectemail', {
        project_id: project_id
    });
});


//get email data for sending mail
router.get('/searchemail', function(req, res) {
    var emailQuery = req.query.term;
    var emailSelect = emailQuery.split(',');
    var length = emailSelect.length;
    emailQuery = emailSelect[length - 1];
    var db = req.db;
    var emailCollection = db.get('email');
    emailCollection.find({
        email: {
            '$regex': emailQuery
        }
    }, {
        'limit': 10
    }, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        res.json(data);
    });
});


//email project details and email
router.post('/projectEmail', function(req, res) {

    var unique_identifier = req.body.project_id;
    var db = req.db;
    var ObjectID = require('mongodb').ObjectID;
    splitEmail = [];
    splitEmail = req.body.emailTo.split(',');
    var tempEmailArray = splitEmail;
    emailDatabase = db.get('email');
    for (i = 0; i < splitEmail.length; i++) {
        insertEmailData(splitEmail[i]);
    }

    function insertEmailData(emailID) {
        emailDatabase.count({
            'email': emailID
        }, function(err, countEmailData) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            if (countEmailData == 0) {
                emailDatabase.insert({
                    'email': emailID
                }, function(err, doc) {
                    if (err) {
                        res.status(404).send('Database Not Connected.');
                        return;
                    }
                    return;
                });
            }
        });
    }

    var emailCollection = {};
    emailCollection['branches'] = [];
    emailCollection['project'] = [];

    var project_collection = db.get('project');
    var server_collection = db.get('server');

    project_collection.find({
        'unique_identifier': unique_identifier
    }, function(err, data) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        data.forEach(function(data) {
            projectArray = {
                unique_identifier: data.unique_identifier,
                git_url: data.git_url
            };
            emailCollection.project.push(projectArray);
            data.branches.forEach(function(data1) {
                var server_id = data1.servername;
                var serverId = new ObjectID(server_id);
                server_collection.find({
                    _id: serverId
                }, function(err, serData) {
                    if (err) {
                        res.status(404).send('Database Not Connected.');
                        return;
                    }
                    serverHost = serData[0].host;
                });
                if ((Object.keys(data1.database).length) > 0) {
                    db_url = data1.database.db_url;
                    db_name = data1.database.db_name;
                    db_username = data1.database.db_username;
                    db_password = data1.database.db_password;
                } else {
                    db_url = "";
                    db_name = "";
                    db_username = "";
                    db_password = "";
                }
                var emailArray = {
                    frndServerName: data1.friendlyservername,
                    git_branch_name: data1.branchname,
                    web_url: data1.web_url,
                    db_url: db_url,
                    db_name: db_name,
                    db_username: db_username,
                    db_password: db_password
                };
                emailCollection.branches.push(emailArray);
            });
            var html = '<html><body style="font-family:Segoe UI,Trebuchet MS,Tahoma; color:#333333; margin: 0 auto; width:600px;"><div style="margin: 5px 0; 	border:1px solid #eee; border-radius:3px; padding:10px;"><h2 style="font-weight:normal; border-bottom:1px solid #eee; padding-bottom:10px;">Project Details: ';
            html += emailCollection.project[0].unique_identifier + '</h2>';
            html += 'Dear <b>' + req.body.emailDear + '</b>, <br><p>Please find server(s) details for project <strong>' + emailCollection.project[0].unique_identifier + '</strong> as below.</p><h4 style="font-weight:normal">Git URL: <strong>' + emailCollection.project[0].git_url + '</strong></h4>';
            for (i = 0; i < emailCollection.branches.length; i++) {
                html += '<h3 style="font-weight:normal; border-bottom:1px solid #eee; padding-bottom:10px;">' + emailCollection.branches[i].frndServerName + '</h3>';
                html += '<table style="font-size:95%"><tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">Git Branch Name:</td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + emailCollection.branches[i].git_branch_name + '</strong></td></tr>';
                html += '<tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">Project URL: </td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + emailCollection.branches[i].web_url + '</strong></td></tr>';
                html += '<tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">phpMyAdmin URL: </td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + emailCollection.branches[i].db_url + '</strong></td></tr>';
                html += '<tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">DB Name: </td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + emailCollection.branches[i].db_name + '</strong></td></tr>';
                html += '<tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">DB User Name: </td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + emailCollection.branches[i].db_username + '</strong></td></tr>';
                html += '<tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">DB Password: </td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + emailCollection.branches[i].db_password + '</strong></td></tr></table>';
            }
            html += '<p>Additional Notes: ' + req.body.message + '</p>';
            html += '<div style="padding-top:10px; margin-top:10px; border-top:1px solid #eee; font-size: 85%; color:#8C8C8C">&copy; 2016 Singsys Pvt Ltd <br/>Systems Deparment - Singsys<p>This email is generated by a program but you can reply to this email in case you find any kind of issue with the information included in this email. Your replies to this email will be inboxed to concerned person from Systems Department.</p></div></div></body></html>';
            var mailOptions = {
                from: 'Systems Department <noreply@singsys.com>',
                to: req.body.emailTo,
                cc: req.body.emailCc,
                replyTo: 'shashwat@singsys.com,nitish@singsys.com,nirmal@singsys.com,prateekkaien@singsys.com ',
                subject: 'Project Details for ' + emailCollection.project[0].unique_identifier,
                html: html,
            };
            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    return console.log(error);
                }
                console.log('Message sent: ' + info.response);
            });
            res.redirect('projectinfo/' + unique_identifier);
        });
    });
});

//send function
router.post('/sendemail', function(req, res) {

    var emailTo = req.body.emailTo;
    splitEmail = [];
    splitEmail = req.body.emailTo.split(',');
    var tempEmailArray = splitEmail;
    var db = req.db;
    emailDatabase = db.get('email');
    for (i = 0; i < splitEmail.length; i++) {
        insertEmailData(splitEmail[i]);
    }

    function insertEmailData(emailID) {
        emailDatabase.count({
            'email': emailID
        }, function(err, countEmailData) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            if (countEmailData == 0) {
                emailDatabase.insert({
                    'email': emailID
                }, function(err, doc) {
                    if (err) {
                        res.status(404).send('Database Not Connected.');
                        return;
                    }
                    return;
                });
            }
        });
    }
    var url = req.body.url;
    var phpmyadmin = req.body.phpmyadmin;
    var db_user = req.body.db_user;
    var db_password = req.body.db_password;
    var db_name = req.body.db_name;
    var branch = req.body.branch;
    var git = req.body.git;
    var message = req.body.message;
    var unique_identifier = req.body.unique_identifier;
    var emailDear = req.body.emailDear;
    var friendlyservername = req.body.friendlyservername;

    var html = '<html><body style="font-family:Segoe UI,Trebuchet MS,Tahoma; color:#333333; margin: 0 auto; width:600px;"><div style="margin: 5px 0; 	border:1px solid #eee; border-radius:3px; padding:10px;"><h2 style="font-weight:normal; border-bottom:1px solid #eee; padding-bottom:10px;">Project Details: ';
    html += unique_identifier + '</h2>';
    html += 'Dear <b>' + emailDear + '</b>, <br><p>Please find server(s) details for project <strong>' + unique_identifier + '</strong> as below.</p><h4 style="font-weight:normal">Git URL: <strong>' + git + '</strong></h4>';
    html += '<h3 style="font-weight:normal; border-bottom:1px solid #eee; padding-bottom:10px;">' + friendlyservername + '</h3>';
    html += '<table style="font-size:95%"><tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">Git Branch Name:</td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + branch + '</strong></td></tr>';
    html += '<tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">Project URL: </td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + req.body.url + '</strong></td></tr>';
    html += '<tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">phpMyAdmin URL: </td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + phpmyadmin + '</strong></td></tr>';
    html += '<tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">DB Name: </td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + db_name + '</strong></td></tr>';
    html += '<tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">DB User Name: </td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + db_user + '</strong></td></tr>';
    html += '<tr><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;">DB Password: </td><td style="font-family:Segoe UI,Trebuchet MS,Tahoma;"><strong>' + db_password + '</strong></td></tr></table>';
    html += '<p>Additional Notes: ' + message + '</p>';
    html += '<div style="padding-top:10px; margin-top:10px; border-top:1px solid #eee; font-size: 85%; color:#8C8C8C">&copy; 2016 Singsys Pvt Ltd <br/>Systems Deparment - Singsys<p>This email is generated by a program but you can reply to this email in case you find any kind of issue with the information included in this email. Your replies to this email will be inboxed to concerned person from Systems Department.</p></div></div></body></html>';

    var mailOptions = {
        from: 'Systems Department <noreply@singsys.com>',
        to: emailTo,
        cc: req.body.emailCc,
        replyTo: 'shashwat@singsys.com,nitish@singsys.com,nirmal@singsys.com,prateekkaien@singsys.com',
        subject: 'Project Details for ' + unique_identifier,
        html: html,
    };
    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
        res.redirect('/branchdetails/' + unique_identifier);
    });
});


//git status function
router.get('/gitRunCommand', function(req, res) {

    var db = req.db;
    var app = req.query.app;
    var branch = req.query.branch;
    var query = '';
    exeQuery = 'git status';
    if (req.query.gitpull) {
        exeQuery = 'git pull origin ' + branch;
    }
    if (req.query.gitlog) {
        exeQuery = 'git log';
    }
    var serArray = {};
    serArray['sshlogin'] = [];
    var project_collection = db.get('project');
    server_collection = db.get('server');
    var MongoClient = require('mongodb').MongoClient;
    MongoClient.connect('mongodb://git.singsys.com:27017/nodetest1', function(err, db) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        var project_collection = db.collection('project');
        project_collection.aggregate([{
            $match: {
                'branches.branchname': branch,
                'unique_identifier': app
            }
        }, {
            "$unwind": "$branches"
        }, {
            $match: {
                'branches.branchname': branch
            }
        }], function(err, results) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            results.forEach(function(bData) {
                ObjectID = require('mongodb').ObjectID;
                var server_id = new ObjectID(bData.branches.servername);
                server_collection.find({
                    _id: server_id
                }, {}, function(err, serData) {
                    serData.forEach(function(serData) {

                        var output = '';
                        var errorMessage = ''
                        if (serData.auth_method == "key") {
                            var auth_array_index = "key";
                        }
                        if (serData.auth_method == "password") {
                            var auth_array_index = "pass";
                        }
                        arr = {
                            host: serData.host,
                            user: serData.username,
                            port: serData.port,
                        };
                        arr[auth_array_index] = serData.auth_value;

                        var ssh = new SSH(arr);
                        var command = 'cd "' + bData.branches.pathonserver + '" && ' + exeQuery + ' ';
                        console.log(command);
                        ssh.exec(command, {
                            out: function(stdout) {
                                output += stdout;
                                console.log('std' + stdout);
                            },

                            err: function(stderr) {

                                hasError = true;
                                output += stderr;
                            },
                            exit: function(exitCode) {
                                res.end(output);
                                db.close();
                            }

                        }).start();
                        ssh.on('error', function(err) {
                            res.end(app + ' (' + branch + ')\nOops, something went wrong.');
                            console.log(err);
                        });
                    });
                })
            });
        });
    });
});


//git command save value
router.post('/addcommand', function(req, res) {
    var commandTitle = req.body.commandName;
    var commandArea = req.body.commandArea;
    var db = req.db;
    var collection = db.get('command');
    collection.insert({
        'title': commandTitle,
        'commandArea': commandArea
    }, function(err, data) {
        if (err) {
            throw new err;
        }
        res.redirect('command');
    });
});


//synch function of git
function syncProject(project, appName, req) {

    var branches = project.branches;
    var user_email = req.query.email || req.body.user_email || '';

    var ref = req.body.ref;
    var branchName = undefined;

    if (ref) {
        branchName = ref.split('/')[2];
    } else if (req.query.branch) {
        branchName = req.query.branch;
    }

    if (branchName) {
        branches = branches.filter(function(branch) {
            return branch.name === branchName;
        });
    };
    var count = 0;
    var retry = 3;
    gitExecute();
    var checkModule = function() {
        if (count < retry) {
            count++;
            gitExecute();
        } else {}
    }

    function gitExecute() {

        branches.forEach(function(branch) {

            var retryLinkCode = '<h3 style="font-family:Consolas">Retry Link</h3><a href="http://git.singsys.com:3000?app=' + req.query.app + '&email=' + user_email + '&branch=' + branch.name + '">click here to retry sync operation</a>';

            var slackRetryLinkCode = '<http://git.singsys.com:3000?app=' + req.query.app + '&email=' + user_email + '&branch=' + branch.name + '|click here to retry sync operation>';
            var hasError = false;

            var errorMessage = '';
            var output = '';

            var currentBranch = branch;

            var ssh = new SSH(currentBranch.sshLogin);

            var emailLogin = {
                'server-ip': currentBranch.sshLogin.host,
                'username': currentBranch.sshLogin.user,
                'project-folder': currentBranch.localPath
            };

            var serverDetailStr = JSON.stringify(emailLogin, null, 4);

            if (branch.runuser != null || branch.runuser != undefined) {

                var command = 'cd "' + currentBranch.localPath + '" && runuser -l ' + branch.runuser + ' -c "git pull origin ' + currentBranch.name + '"';

            } else {


                var command = 'cd "' + currentBranch.localPath + '" && git pull origin ' + currentBranch.name;
            }

            try {

                ssh.exec(command, {

                    out: function(stdout) {
                        output += stdout;
                        console.log(stdout);
                    },

                    err: function(stderr) {

                        hasError = true;
                        errorMessage += stderr;
                        console.log(stderr);

                    },

                    exit: function(exitCode) {

                        if (exitCode != 0) {
                            var mailOptions = {
                                from: 'Git Error Pull <noreply@singsys.com>',
                                to: user_email,
                                cc: 'shashwat@singsys.com, nirmal@singsys.com, nitish@singsys.com,prateekkaien@singsys.com',
                                subject: 'Code Sync Failed - Pull Failed - Project: ' + appName + ', Branch: ' + currentBranch.name,
                                text: errorMessage,
                                html: '<h2 style="color:maroon; font-family:Consolas;">Code Sync Failed With Following Error</h2><pre style="font-size: 14px">' + output + '\n\n' + errorMessage + '</pre><h2 style="font-family:Consolas">Server Details</h2><pre style="font-size: 14px">' + serverDetailStr + '</pre>' + retryLinkCode
                            };

                            transporter.sendMail(mailOptions, function(error, info) {
                                if (error) {
                                    return console.log(error);
                                }
                                console.log('Message sent: ' + info.response);
                                return 1;
                            });

                            var optionsGitError = {
                                uri: "https://hooks.slack.com/services/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",
                                form: '{"attachments":[{"fallback":"Git Pull Error[Urgent]","pretext":"Git Pull Error[' + appName + ']","color":"danger","fields":[{"title":"Output","value":"```' + output + '```","short":false},{"title":"Error Message","value":"```' + errorMessage + '```","short":false},{"title":"Server Details","value":"Server-ip : ' + currentBranch.sshLogin.host + ' \n username : ' + currentBranch.sshLogin.user + ' \n project-folder : ' + currentBranch.localPath + '","short":false,"mrkdwn_in":true},{"title":"Retry Link Code","value":"' + slackRetryLinkCode + '","short":false}],"mrkdwn_in": ["text","pretext","fields"]}],"channel": "#git-error","parse":"none"}'
                            };

                            request.post(optionsGitError, function(error, response, html) {
                                console.log(html);
                                //console.log(error);
                                return 1;
                            });

                            if (user_email) {
                                var extractUsername = user_email.split('@');
                                var userName = '@' + extractUsername[0] + '.singsys';

                                var optionsUserError = optionsGitError;
                                optionsUserError.form = optionsUserError.form.replace("#git-error", userName);

                                request.post(optionsUserError, function(error, response, html) {
                                    console.log(html);
                                    //console.log(error);
                                    return 1;
                                });
                            }
                        } else {
                            count = 3;
                            var extractUsername = user_email.split('@');
                            var userName = '@' + extractUsername[0] + '.singsys';
                            var optionsGitError = {
                                uri: "https://hooks.slack.com/services/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",
                                form: '{"attachments":[{"fallback":"Ta da \n' + appName + '\nCode Synchronized","pretext":"Code Synchronized [' + appName + ']","color":"danger","fields":[{"title":"Output","value":"```' + output + '```","short":false}],"mrkdwn_in": ["text","pretext","fields"]}],"channel": "' + userName + '" }'
                            };

                            request.post(optionsGitError, function(error, response, html) {
                                console.log(userName + ' : ' + html);
                                if (error) {
                                    console.log(userName + ' : ' + error);
                                }
                                return 1;
                            });

                            //var userName1 = '@shashwat';
                            //var optionsGitError1 = {
                            //    uri: "https://hooks.slack.com/services/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",
                            //    form: '{"attachments":[{"fallback":"Ta da \n' + appName + '\nCode Synchronized","pretext":"Code Synchronized [' + appName + ']","color":"danger","fields":[{"title":"Output","value":"```' + output + '```","short":false}],"mrkdwn_in": ["text","pretext","fields"]}],"channel": "' + userName1 + '","parse":"none"}'
                            //};
                            //
                            //request.post(optionsGitError1, function(error, response, html) {
                            //    console.log(userName1 + ' : ' + html);
                            //    if (error) {
                            //        console.log(userName1 + ' : ' + error);
                            //    }
                            //    return 1;
                            //});

                            var userName2 = '@shashwat';
                            var optionsGitError2 = {
                                uri: "https://hooks.slack.com/services/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",
                                form: '{"attachments":[{"fallback":"Ta da \n' + appName + '\nCode Synchronized","pretext":"Code Synchronized [' + appName + ']","color":"danger","fields":[{"title":"Output","value":"```|</\(/\)>```","short":false}],"mrkdwn_in": ["text","pretext","fields"]}],"channel": "' + userName2 + '","parse":"full"}'
                            };

                            request.post(optionsGitError2, function(error, response, html) {
                                console.log(userName2 + ' : ' + html);
                                if (error) {
                                    console.log(userName2 + ' : ' + error);
                                }
                                return 1;
                            });
                        }
                    }
                }).start();
            } catch (ex) {
                console.log('Error ' + ex);
            }

            ssh.on('error', function(err) {

                if (count == 2) {
                    var mailOptions = {
                        from: 'Git Error Login <noreply@singsys.com>',
                        to: user_email,
                        cc: 'shashwat@singsys.com, nirmal@singsys.com, nitish@singsys.com,prateekkaien@singsys.com',
                        subject: 'Code Sync Failed - Server Login Failed - Poject: ' + appName + ', Branch: ' + currentBranch.name,
                        text: err.message,
                        html: '<h2 style="color:maroon; font-family:Consolas;">Server Login Failed With Following Error</h2><pre style="font-size: 14px">' + err.message + '</pre><h2 style="font-family:Consolas">Server Details</h2><pre style="font-size: 14px">' + serverDetailStr + '</pre>' + retryLinkCode
                    };

                    transporter.sendMail(mailOptions, function(error, info) {

                        if (error) {
                            return console.log(error);
                        }
                        console.log('Message sent: ' + info.response);
                        return 1;
                    });

                    var options1 = {
                        uri: "https://hooks.slack.com/services/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",
                        form: '{"attachments":[{"fallback":"Login Failed [Urgent]","pretext":"Login Failed [' + appName + ']","color":"danger","fields":[{"title":"Error Message","value":"' + err.message + '","short":false},{"title":"Server Details","value":"Server-ip : ' + currentBranch.sshLogin.host + ' \n username : ' + currentBranch.sshLogin.user + ' \n project-folder : ' + currentBranch.localPath + '","short":false,"mrkdwn_in":true},{"title":"Retry Link Code","value":"' + slackRetryLinkCode + '","short":false}],"mrkdwn_in": ["text","pretext","fields"]}]}'
                    };

                    request.post(options1, function(error, response, html) {
                        return 1;
                    });

                    ssh.end();
                } else {
                    checkModule();
                }
            });
        });
    }
}


//email page
router.get('/sendemail/:_id', function(req, res) {
    var id = req.params._id;
    res.render('sendemail', {
        'email': id
    });
});


//mail data fetch
router.get('/emailDataFetch', function(req, res) {

    _id = req.query.emailData;
    var db = req.db;
    var server_collection = db.get('server');
    serArray = [];
    var ObjectID = require('mongodb').ObjectID;
    var _id = new ObjectID(_id);
    var MongoClient = require('mongodb').MongoClient;
    MongoClient.connect('mongodb://localhost:27017/nodetest1', function(err, db) {
        if (err) {
            res.status(404).send('Database Not Connected.');
            return;
        }
        var col = db.collection('project');
        col.aggregate([{
            $match: {
                'branches.branch_id': _id
            }
        }, {
            "$unwind": "$branches"
        }, {
            $match: {
                'branches.branch_id': _id
            }
        }], function(err, results) {
            if (err) {
                res.status(404).send('Database Not Connected.');
                return;
            }
            results.forEach(function(result) {
                var server_id = result.branches.servername;
                var server_id1 = new ObjectID(server_id);
                server_collection.find({
                    _id: server_id
                }, {}, function(err, data) {
                    if (Object.keys(result.branches.database).length > 0) {
                        serArray = {
                            url: result.branches.web_url,
                            phpmyadmin: result.branches.database.db_url,
                            db_user: result.branches.database.db_username,
                            db_password: result.branches.database.db_password,
                            db_name: result.branches.database.db_name,
                            branch: result.branches.branchname,
                            git: result.git_url,
                            unique_identifier: result.unique_identifier,
                            friendlyservername: result.branches.friendlyservername
                        };
                    } else {
                        serArray = {
                            url: result.branches.web_url,
                            branch: result.branches.branchname,
                            git: result.git_url,
                            unique_identifier: result.unique_identifier,
                            friendlyservername: result.branches.friendlyservername
                        };
                    }
                    res.json(serArray);
                    db.close();
                });
            });
        });
    });
});

module.exports = router;
