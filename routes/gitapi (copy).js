var express = require('express');
var router = express.Router();
var request = require('request');
var singsys = 'http://git.singsys.com/';

//function to verify user
function loginverify(req, res, next) {
    if (!req.session.access_token) {
        res.redirect('/gitapi');
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
        console.log(err);
        console.log(response);
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
router.get('/projectList', loginverify, function(req, res) {
    var options = {
        uri: singsys + 'api/v3/projects?access_token=' + req.session.access_token + '&per_page=100',
    }
    
    request(options, function(error, response, html) {
        if (error) {
            res.end('Error');
        }
        if (!error && req.session.access_token != undefined) {
            var pageSession = parseInt(response.headers["x-total-pages"]);
            req.session.totalpage = pageSession;
            console.log(pageSession);
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
            var commanddata;
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
                    var command = db.get('command');
                    command.find({}, {}, function(err, value) {
                        if (err) {
                            console.log(err);
                        }
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
                            'command': value
                        });
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
            } //function loop ends here
        } else {
            res.redirect('/gitapi');
        } /////// else 
    }); //request
    //res.send(req.session);
})

module.exports = router;
