var express = require('express');
var router = express.Router();
var singsys = 'http://git.singsys.com/';
var request = require('request');

/* GET users listing. */

router.get('/', function(req, res, next) {
    var db = req.db;
    var users = db.get('users');
    var userData = {};
    userData['count'] = [];
    users.find({}, function(err, data) {
        if (err) {
            console.log(err);
            return 0;
        } else {
            data.forEach(function(data1) {
                ar = {
                    'name': data1.name,
                    'email': data1.email,
                    'id': data1.id
                }
                userData.count.push(ar);
            });
            res.render('userlist', {
                'data': userData.count
            });
        }
    });
});

router.get('/refreshUserList', function(req, res, next) {

    var db = req.db;
    var users = db.get('users');
    var options = {
        uri: singsys + 'api/v3/users?access_token=' + req.session.access_token + '&per_page=100&active=true',
    }
    console.log(options);
    request(options, function(error, response, html) {
        if (error) {
            res.end('Error');
        } else {
            var pageSession = parseInt(response.headers["x-total-pages"]);
            var html1 = JSON.parse(html);
            JSON.parse(html).forEach(function(obj) {
                // console.log(obj.name + '=====' + obj.email);
                users.findOne({
                    email: obj.email
                }, function(err, doc) {
                    if (err) {
                        console.log(err);
                        return 0;
                    }
                    if (doc == null) {
                        users.insert({
                            name: obj.name,
                            email: obj.email,
                            id: obj.id,
                            branch: []
                        })
                    } else {
                        console.log(obj.name + '=== exists');
                    }
                });
            });
            console.log(pageSession);
            if (pageSession > 1) {
                findNextPage(2, req);
            }
            return;
        }
    });
});

function findNextPage(page, req) {
    var page = page;
    var db = req.db;
    var users = db.get('users');
    var options = {
        uri: singsys + 'api/v3/users?access_token=' + req.session.access_token + '&per_page=100&active=true&page=' + page,
    }
    console.log(options);
    request(options, function(error, response, html) {
        if (error) {
            res.end('Error');
        } else {
            var pageSession = parseInt(response.headers["x-total-pages"]);
            var html1 = JSON.parse(html);
            JSON.parse(html).forEach(function(obj) {
                // console.log(obj.name + '=====' + obj.email);
                users.findOne({
                    email: obj.email
                }, function(err, doc) {
                    if (err) {
                        console.log(err);
                        return 0;
                    }
                    if (doc == null) {
                        users.insert({
                            name: obj.name,
                            email: obj.email,
                            id: obj.id,
                            branch: []
                        })
                    } else {
                        console.log(obj.name + '=== exists');
                    }
                });
            });
            if (pageSession > page) {
                findNextPage(page++, req);
            }
            return;
        }
    });
}

router.get('/projectadd/:id', function(req, res) {
    var userId = req.params.id;
    var db = req.db;
    var users = db.get('users');
    users.find({
        name: userId
    },{}, function(err, data) {
        if (err) {
            console.log(err);
            return 0;
        }
        res.render('consoleprojectlist',{data:data});
    });
});

module.exports = router;