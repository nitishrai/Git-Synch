var express = require('express');
var router = express.Router();
var request = require('request');
var singsys = 'http://git.singsys.com/';
var io = require('socket.io')();


//function to verify user
function loginverify(req, res, next) {
    if (!req.session.access_token) {
        res.redirect('/gitapi/gitlogin');
    } else
        next();
}


//gitlab login
router.get('/', function(req, res) {

    res.render('gitlogin');
});

//login for git
router.post('/loginapi', function(req, res) {

    var options = {
        uri: singsys + 'oauth/token',
        form: {
            "grant_type": "password",
            "username": req.body.login_name,
            "password": req.body.password,
        },
    }
    request.post(options, function(err, response, html) {
        if (err) {
            res.end('error')
        } else {
            var html1 = JSON.parse(html);
            req.session.access_token = html1.access_token;
            //res.send(req.session);
            res.redirect('/gitapi/projectList');
        }
    });
});


// get project list from git api
router.get('/projectList', function(req, res) {
    var options = {
        uri: singsys + 'api/v3/projects?access_token=' + req.session.access_token + '&per_page=100',
    }
    console.log(options);
    request(options, function(error, response, html) {
        if (error) {
            res.end('Error');
        }
        if (!error && req.session.access_token != undefined) {
            var pageSession = parseInt(response.headers["x-total-pages"]);
            req.session.totalpage = pageSession;
            var html1 = JSON.parse(html);
            var dbArray = {};
            dbArray['data'] = [];
            html1.forEach(function(databaseArray) {
                array1 = {
                    'id': databaseArray.name,
                    'groupId': databaseArray.namespace.path
                }
                dbArray.data.push(array1);
            });
            /*
             * result from the api is pushed to array and passed database to check for the branch
             */
            var a = dbArray.data;
            arrayLength = Object.keys(dbArray.data).length;
            var finalBranchData = {};
            finalBranchData['data'] = [];
            var db = req.db;
            var count = 0;
            hello();
            var checkModule = function() {
                if (count < (arrayLength) - 1) {
                    count++;
                    hello();
                } else {
                    var finalLength = finalBranchData.data.length;
                    for (i = 0; i < finalLength; i++) {
                        if (Array.isArray(finalBranchData.data[i])) {
                            html1[i].mongo = finalBranchData.data[i];
                        } else
                            html1[i].mongo = '';
                    }
                    res.render('gitProjectList', {
                        'data': html1,
                        'page': req.session.totalpage,
                    });
                }
            }

            function hello() {
                var branchArray = {};
                branchArray['branchData'] = [];
                var id = a[count].id;
                var groupId = a[count].groupId;
                var collection = db.get('project');
                collection.count({
                    'unique_identifier': id,
                    'group': groupId
                }, function(error, cData) {
                    if (error) {
                        res.status(404).send('Database Not Connected.');
                        return;
                    }
                    if (cData == 1) {
                        collection.find({
                            'unique_identifier': id,
                            'group': groupId
                        }, {}, function(err, data) {
                            if (err) {
                                res.status(404).send('Database Not Connected.');
                                return;
                            }
                            if (data) {
                                data.forEach(function(data) {
                                    if (data.branches.length > 0) {
                                        var bcount = data.branches.length;
                                        check = 2 * bcount;
                                        data.branches.forEach(function(bData) {
                                            branchArray.branchData.push({
                                                branchname: bData.branchname.toString(),
                                                branch_id: bData.branch_id
                                            });

                                            bcount++;
                                            if (check == bcount) {
                                                finalBranchData.data.push(branchArray.branchData);
                                            }
                                        });
                                    } else {
                                        var errArray = {
                                            'data': 'No Branch Found Project Exist ' + id
                                        };
                                        finalBranchData.data.push(errArray);
                                    }
                                    checkModule();
                                });
                            }
                        });
                    } else {
                        var errArray = {
                            'data': 'No Branch Found' + id
                        };
                        finalBranchData.data.push(errArray);
                        checkModule();
                    }
                });
            } //fuctiojn loop ends here
        } else {
            res.send('Please Login');
        } /////// else 
    }); //request
    //res.send(req.session);
})


// ajax page request
router.get('/getallProject', function(req, res) {
    var page = req.query.page;
    var options = {
        uri: singsys + 'api/v3/projects?access_token=' + req.session.access_token + '&per_page=100&page=' + page + '',
    }
    console.log(options);
    request(options, function(error, response, html) {
        if (error) {
            res.end('Error');
        }
        if (!error) {
            var pageSession = parseInt(response.headers["x-total-pages"]);
            req.session.totalpage = pageSession;
            var html1 = JSON.parse(html);
            var dbArray = {};
            dbArray['data'] = [];
            html1.forEach(function(databaseArray) {
                array1 = {
                    'id': databaseArray.name,
                    'groupId': databaseArray.namespace.path
                }
                dbArray.data.push(array1);
            });
            var a = dbArray.data;
            arrayLength = Object.keys(dbArray.data).length;
            var finalBranchData = {};
            finalBranchData['data'] = [];
            var db = req.db;
            var count = 0;
            hello();
            var checkModule = function() {
                if (count < (arrayLength) - 1) {
                    count++;
                    hello();
                } else {
                    var finalLength = finalBranchData.data.length;
                    for (i = 0; i < finalLength; i++) {
                        if (Array.isArray(finalBranchData.data[i])) {
                            html1[i].mongo = finalBranchData.data[i];
                        } else
                            html1[i].mongo = '';
                    }
                    //res.send(html1);
                    res.json({
                        'data': html1
                    });
                }
            }

            function hello() {
                var branchArray = {};
                branchArray['branchData'] = [];
                var id = a[count].id;
                var groupId = a[count].groupId;
                var collection = db.get('project');
                collection.count({
                    'unique_identifier': id,
                    'group': groupId
                }, function(error, cData) {
                    if (error) {
                        res.status(404).send('Database Not Connected.');
                        return;
                    }
                    if (cData == 1) {
                        collection.find({
                            'unique_identifier': id,
                            'group': groupId
                        }, {}, function(err, data) {
                            if (err) {
                                res.status(404).send('Database Not Connected.');
                                return;
                            }
                            if (data) {
                                data.forEach(function(data) {
                                    if (data.branches.length > 0) {
                                        var bcount = data.branches.length;
                                        check = 2 * bcount;
                                        data.branches.forEach(function(bData) {
                                            branchArray.branchData.push({
                                                branchname: bData.branchname.toString(),
                                                branch_id: id
                                            });
                                            bcount++;
                                            if (check == bcount) {
                                                finalBranchData.data.push(branchArray.branchData);
                                            }
                                        });
                                    } else {
                                        var errArray = {
                                            'data': 'No Branch Found Project Exist ' + id
                                        };
                                        finalBranchData.data.push(errArray);
                                    }
                                    checkModule();
                                });
                            }
                        });
                    } else {
                        var errArray = {
                            'data': 'No Branch Found' + id
                        };
                        finalBranchData.data.push(errArray);
                        checkModule();
                    }
                });
            } //fuctiojn loop ends here
        } /////// else 
    }); //request
})

//branch details fetch page
// router.post('/branchdetails', function(req, res) {

//     var a = req.body;
//     arrayLength = Object.keys(a).length;
//     console.log('arrayLength is :' + arrayLength);
//     var finalBranchData = {};
//     finalBranchData['data'] = [];
//     var db = req.db;
//     var count = 0;
//     hello();
//     var checkModule = function() {
//         if (count < (arrayLength / 2) - 1) {
//             count++;
//             hello();
//         } else {
//             console.log(finalBranchData.data);
//         }
//     }

//     function hello() {
//         var branchArray = {};
//         branchArray['branchData'] = [];
//         var id = 'data[' + count + '][id]';
//         var groupId = 'data[' + count + '][groupId]';
//         var collection = db.get('project');
//         collection.count({
//             'unique_identifier': a[id],
//             'group': a[groupId]
//         }, function(error, cData) {
//             if (error) {
//                 res.status(404).send('Database Not Connected.');
//                 return;
//             }
//             if (cData == 1) {
//                 collection.find({
//                     'unique_identifier': a[id],
//                     'group': a[groupId]
//                 }, {}, function(err, data) {
//                     if (err) {
//                         res.status(404).send('Database Not Connected.');
//                         return;
//                     }
//                     if (data) {
//                         data.forEach(function(data) {
//                             if (data.branches.length > 0) {
//                                 var bcount = data.branches.length;
//                                 check = 2 * bcount;
//                                 data.branches.forEach(function(bData) {
//                                     branchArray.branchData.push({
//                                         branchname: bData.branchname.toString(),
//                                         branch_id: a[id]
//                                     });
//                                     bcount++;
//                                     if (check == bcount) {
//                                         finalBranchData.data.push(branchArray.branchData);
//                                     }
//                                 });
//                             } else {
//                                 var errArray = {
//                                     'data': 'No Branch Found Project Exist ' + a[id]
//                                 };
//                                 finalBranchData.data.push(errArray);
//                             }
//                             checkModule();
//                         });
//                     }
//                 });
//             } else {
//                 var errArray = {
//                     'data': 'No Branch Found' + a[id]
//                 };
//                 finalBranchData.data.push(errArray);
//                 checkModule();
//             }
//         });
//     }
// });

router.get('/console', function(req, res) {

    var project_name = req.query.app;
    var branche_name = req.query.branch

    var ObjectID = require('mongodb').ObjectID;
    var _id = new ObjectID(branche_name);

    var MongoClient = require('mongodb').MongoClient;

    var db1 = req.db;
    var collection = db1.get('server');

    var ObjectID = require('mongodb').ObjectID;

    MongoClient.connect('mongodb://localhost:27017/nodetest1', function(err, db) {
        if (err) {
            res.status(404).send('Database Not Connected .');
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
                    //res.send(result);
                    res.render('projectconsole', {
                        'branchdata': result,
                        'server': serverdata,
                        'servern': data
                    });
                    db.close();
                });
            });
        });
    });

})

router.get(/^\/searchproject\/([a-zA-Z0-9-]+)(?:\/(\w+))?$/, function(req, res) {
    var searchQueryProjectName = req.params[0];
    var getBranch = req.params[1];
    console.log(searchQueryProjectName);
    var db = req.db;
    var project = db.get('project');
    var projectArray = {};
    projectArray['data'] = [];
    projectCount = 0;
    project.find({
        'unique_identifier': {
            '$regex': searchQueryProjectName
        }
    }, function(err, data) {
        if (err) {
            console.log(err);
            return 0;
        }
        data.forEach(function(data) {
            var arr;
            projectCount++;
            if (getBranch == null) {
                arr = {
                    'unique_identifier': data.unique_identifier,
                    '_id': data._id,
                    'project': true,
                    'branch': data.branches.length,
                }
                projectArray.data.push(arr);
            } else {
                data.branches.forEach(function(branch) {
                    arr = {
                        'branch': branch.branchname,
                        '_id': branch.branch_id,
                        'unique_identifier': data.unique_identifier
                    }
                    console.log(arr);
                    projectArray.data.push(arr);
                });
            }
        });
        res.send(projectArray.data);
    });
});

module.exports = router;