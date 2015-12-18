var express = require('express');
var router = express.Router();
var validator = require('validator');
var Regex = require("regex");

/*Welcome Page*/
router.get('/welcome', function(req, res, next)
{
  res.render('welcome', { title: 'welcome' });
});

/* GET home page. */
router.get('/', function(req, res, next)
{
  res.render('index', { title: 'Express' });
});


//front page to access both project and serverlist
router.get('/dashboard',function(req,res)
{
 res.render('dashboard',{title: 'dashboard'});
});


// to add a new project
router.get('/newproject', function(req, res)
{
  res.render('newproject', { title	: 'Add New Project' });
});


//to add a new server
router.get('/newserver',function(req,res)
{
	res.render('newserver', { title1 : 'Add New server'});
});

//project Edit form
router.get('/projectedit/:_id',function(req,res){
  var id = req.params._id;
  var db = req.db ;
  var collection = db.get('project');
  var ObjectID = require('mongodb').ObjectID;
  var project_id = new ObjectID(id);
  collection.count({_id : project_id},function(err,data)
  {
    if (err) throw err;
    if(data)
    {
      collection.find({_id : project_id},function(err,data)
      {
	if (err) throw err;
	res.render('projectedit',{'project' :data});
      });
    }
    else
    {
      res.status(404).send('Project Does Not Exist');
    }
  });
  
});


//brand add form
router.get('/branchadd/:_id',function(req,res)
{
  var project_id = req.params._id;
  var db = req.db;
  var ObjectID = require('mongodb').ObjectID;
  var _id = new ObjectID(project_id);
  var project_collection = db.get('project');
  var collection = db.get('server');
  project_collection.count({_id: _id},function(err,data){
    if(err) throw err;
    if(data)
    {
      collection.find({},{},function(e,serverdata)
      {
	res.render('branchadd',{'project_id' : project_id,'server':serverdata});
      });
    }
    else
    {
      res.send('404 Error Page Not Fouund',404);  
    }
  });
});

router.get('/branchdetails/:_id',function(req,res){
  var project_id = req.params._id;
  var check_project_id = validator.isMongoId(project_id);
  if(check_project_id)
    res.render('branchdetails',{'project_id' : project_id});
  else
    res.send('404: Page not Found', 404);
});


//show project list
router.get('/projectlist', function(req, res)
{
	var db = req.db;
	var collection = db.get('project');
	collection.find({},{},function(err,data){
	  console.log(data);
		res.render('projectlist',{"projects":data});
	});
}); 

//show server list
router.get('/serverlist',function(req,res)
{
    var db = req.db;
    var collection = db.get('server');
    collection.find({},{},function(err,data)
    {
      res.render('serverlist',{"server":data});   
    });
});


//editing the given project
router.get('/projectview/:_id',function(req, res)
{
    var id = req.params._id;
    var db = req.db ;
    var collection = db.get('server');
    var check_project_id = validator.isMongoId(id);
    if(check_project_id)
    {
      collection.find({},{},function(e,serverdata)
      {
	res.render('projectview', { title   : 'Add New Project', "server" : serverdata , "project_id" : id});
      });
    }
    else
      res.send('404 Page Not Found',404);
});


//getting the dashboard for project where branch can be added or deleted
router.get('/projectinfo/:_id',function(req,res){
  var id = req.params._id;
  var db = req.db;
  var ObjectID = require('mongodb').ObjectID;
  var project_id = new ObjectID(id);
  var collection = db.get('project'); 
  var check_project_id = validator.isMongoId(id);
  if(check_project_id)
  {
    collection.count({_id : project_id},function(err,data){
	if(err) throw err;
	if(data)
	 res.render('projectinfo',{'project_id' : id});
	else
	 res.send('Project Not Found',404);
    });
  }
  else
    res.send('404 Page Not Found',404);
  });


//viewing the server data
router.get('/serverview/:_id',function(req,res)
{
  var server_id = req.params._id;
  var db = req.db;
  var ObjectID = require('mongodb').ObjectID;
  var _id = new ObjectID(server_id);
  
  var check_project_id = validator.isMongoId(server_id);

  var collection = db.get('server');
  collection.find({_id : server_id},{},function(err,data){
   res.render('serverview',{'serverdata':data});
  });
});


//saving the updated server details
router.post('/updateserver',function(req,res)
{
  var server_id = req.body.server_id;
  var server_identifier_name = req.body.server_identifier_name;
  var host = req.body.hostip ;
  var port = req.body.portno;
  var username = req.body.username ;
  var authkey = req.body.auth_value;
  var authmethod = req.body.authmethod;
  
  if(authmethod == 1)
  {
    auth_method = "key";
  }
  if(authmethod ==2)
  {
    auth_method = "password";
  }
  
  var db = req.db;
  var collection = db.get('server');
 
  var check_server_identifier_name = (/^[a-z0-9\_]{3,30}$/).test(server_identifier_name);
  var check_host = validator.isIP(host);
  var check_port = validator.isNumeric(port);
  var check_username = (/^[a-zA-Z0-9\_]{3,30}$/).test(username);
  var check_authmethod = validator.isNull(authmethod);
  var check_authkey = validator.isNull(authkey);
  
  var ObjectID = require('mongodb').ObjectID;
  var _id = new ObjectID(server_id);

  if(!check_authkey && !check_authmethod && check_server_identifier_name && check_host && check_port && check_username)
  {
    collection.update({_id : _id},{'server_identifier_name':server_identifier_name,'host':host,'port':port,'username':username,'auth_method':auth_method,'auth_value':authkey},function(err,data)
    {
      if (err) throw err;
      res.redirect('serverlist');
    });
  }
  else
  {
    res.send('You Entered Incorrect Data');
  }
});


//displaying the details of the given edit branch
router.get('/branchedit/:_id',function(req,res)
{
  var branch_id =  req.params._id;
  var MongoClient = require('mongodb').MongoClient;
  var db1 = req.db;
  var collection = db1.get('server'); 

  var ObjectID = require('mongodb').ObjectID;
  var _id = new ObjectID(branch_id);
  MongoClient.connect('mongodb://localhost:27017/nodetest1', function(err, db)
  {
    var col=db.collection('project');
    col.aggregate([{$match: {'branches.branch_id':_id}}, {"$unwind":"$branches"},{$match:{'branches.branch_id':_id}}],function(err, result)
    { 
      result.forEach(function(result)
      {
	servername = result.branches.servername;
	server_id = new ObjectID(servername);
      });
      collection.find({},{},function(e,serverdata)
      {
	collection.find({_id:server_id},function(err,data)
	{
	  console.log(data);
	  res.render('branchedit', {'branchdata':result,'server':serverdata,'servern':data});
	});
      });
    });
  });
});


//updating a branch details
router.post('/updatebranch',function(req,res)
{
  var db = req.db;
  console.log(req.body);
  var project_id = req.body.project_id;
  branch_id  = req.body.branch_id;
  branchname = req.body.branchname;
  pathonserver = req.body.pathonserver;
  friendlyservername = req.body.friendlyservername;
  servername = req.body.servername;
  web_url = req.body.web_url;
  
  var ObjectID =  require('mongodb').ObjectID;
  p_id = new ObjectID(project_id);
  b_id = new ObjectID(branch_id);
  
  var check_branchname = (/^[a-z0-9\_]{3,30}$/).test(branchname);
  var check_pathonserver = (/^[a-z0-9\/]{3,60}$/).test(pathonserver);
  var check_friendlyservername = (/^[a-z0-9\_]{3,30}$/).test(friendlyservername);
  var check_servername = validator.isNull(servername);
  var check_web_url =  true;
  if(web_url!='')
  {
    var check_web_url = validator.isURL(web_url);
  }
  
  var collection = db.get('project');

  if(!check_servername && check_friendlyservername && check_pathonserver && check_branchname && check_web_url)
  {
    collection.update(
      {'branches.branch_id':b_id},
      {"$set":
	  {
	      'branches.$.branchname':branchname,
	      'branches.$.pathonserver':pathonserver,
	      'branches.$.friendlyservername':friendlyservername,
	      'branches.$.web_url':web_url,
	      'branches.$.servername':servername
	  }
      },
      function(err,data)
      {   
       if (err) throw err;
       res.redirect('/branchdetails/'+project_id);
      });
  }
  else
  {
    res.send('You Entered The Incorrect Data');
  }
});


//deleting a  given branch
router.get('/branchdelete/:_id',function(req,res)
{
  var branch_id = req.params._id ;
  var db = req.db;
  var collection =  db.get('project');
  var ObjectID =  require('mongodb').ObjectID;
  var _id = new ObjectID(branch_id);
  collection.update({'branches.branch_id' : _id },{$pull :{"branches" :{ 'branch_id' : _id }}},function(err,data)
  {
    if (err) throw err;
    res.redirect('back');   
  });
});


//fetching branch details of a project
router.get('/branchfetch',function(req,res)
{
 var project_id = req.query.project_id;
 var db = req.db;
 var i = 0;
 var branchdata = [];
 var collection = db.get('project');
 collection.find({'_id' : project_id},{},function(err,data)
  {
    if (err) throw err;
    // res.json(data);
    data.forEach(function(data)
    {
      console.log(data);
      res.json(data.branches);
    });    
  });
});


//router.all('/exe', function(req, res, next)
//{
//  var appName = req.query.app;
//  var unique_ = 'nitish1';
//  var db = req.db ;
//  var project = {} ;
//  project['branches'] = [];
//  var project_collection = db.get('project');
//  var server_collection = db.get('server');
//  project_collection.find({'unique_identifier': unique_},function(err,data)
//  {
//    data.forEach(function(projectobject)
//    {
//      projectobject.branches.forEach(function(branch)
//      {	
//	server_collection.find({_id: branch.servername},function(err,serverdata)
//	{
//	  serverdata.forEach(function(serverdata)
//	  {
//	    project.branches.push(
//	    {    
//	      name: branch.branchname,
//	      serverName: branch.friendlyservername ,
//	      localPath: branch.pathonserver,
//	      sshLogin :
//	      {
//		host: serverdata.host,
//		user: serverdata.username,
//		pass: serverdata.auth_value,
//		port: serverdata.port
//	      }
//	    });
//	  });
//	});
//      });
//    });
//  });
//  console.log(project.branches.length);
//});


router.all('/exe', function(req, res, next)
{
  var appName = req.query.app;
  var unique_ = 'nitish1';
  var db = req.db ;
  var project = {} ;
  project['branches'] = [];
  var project_collection = db.get('project');
  var server_collection = db.get('server');
  var obj1 = new Object();
  var count ;
  project_collection.find({'unique_identifier': unique_},function(err,data)
  {
    if (err) throw err;
    data.forEach(function(projectobject)
    {
      count = projectobject.branches.length;
      check_count = count + count ;
      projectobject.branches.forEach(function(branch)
      {	
	server_collection.find({_id: branch.servername},function(err,serverdata)
      	{
      	  if (err) throw err;
      	  serverdata.forEach(function(serverdata)
      	  {
       	    count ++ ;
	    if(serverdata.auth_method=="key")
	    {
	      var auth_array_index = "key";
	    }
	    if(serverdata.auth_method=="password")
	    {
	      var auth_array_index = "password";
	    }
	    var push_branch_array={
				    name	: branch.branchname,
				    serverName	: branch.friendlyservername ,
				    localPath	: branch.pathonserver,
				    sshLogin :
				    {
				      host		: serverdata.host,
				      user		: serverdata.username,
				      port		: serverdata.port
				    }
				  };
	    push_branch_array['sshLogin'][auth_array_index] = serverdata.auth_value;	  	  
	    project.branches.push(push_branch_array);
	    if(count == check_count)
	    {
	      console.log(project.branches);
	    }
          });	
      	  //
        });
      });
    });
  });
});


//checking for unique project name
router.get('/uniqueproject',function(req,res)
{
 var identifier = req.query.unique_identifier;
 var db = req.db;
 console.log(identifier);
 var collection = db.get('project');
 collection.count({ unique_identifier: identifier}, function(err, countdata) 
 {
     if (err) throw err;
     res.json({isavailable:(countdata > 0 ? false : true)});
  });
});


//checking for unique servername
router.get('/serverunique',function(req,res)
{	
  var identifier = req.query.unique_identifier;
  var db = req.db;
  console.log(identifier);
  var collection = db.get('server');
  collection.count({server_identifier_name : identifier}, function(err,countdata)
    {
	if (err) throw err;
	res.json({isavailable : (countdata > 0 ? false : true)});
    });
});


//add new project
router.post('/addproject', function(req, res)
{
  var db = req.db;
  var unique_identifier = req.body.unique_identifier;
  var email = req.body.email;

  var collection = db.get('project');
  
  var check_unique_identifier =  (/^[a-z0-9\_]{3,30}$/).test(unique_identifier);
  var check_email = validator.isEmail(email);

  console.log(check_unique_identifier);
  console.log(check_email);

  if(check_email && check_unique_identifier)
  {
    collection.count({ unique_identifier: unique_identifier}, function(err, countdata) 
    {
      if (err) throw err;
      if(!countdata)
      {
	collection.insert({
	    "unique_identifier" : unique_identifier,
	    "email" : email,
	    "branches" : [],
	    "date_added" : new Date()
	}, function (err, doc) {
	    if (err)
	    {
	      res.send("There was a problem adding the information to the database.");
	    }
	    else
	    {
	      res.redirect("projectlist");
	    }
	});
      }
      else
      {
	res.status(404).body('404 Project Already Exist');
      }
    });    
  }
  else
  {
    res.send('Incorrect Data Entered');
  }
});


//update project info
router.post('/updateproject',function(req,res){

var project_id =  req.body.project_id;
var unique_identifier =  req.body.unique_identifier;
var email =  req.body.email;
var web_url =  req.body.web_url;

var db = req.db;
var collection = db.get('project');

var ObjectID =  require('mongodb').ObjectID;
var _id = new ObjectID(project_id);

collection.count({_id : project_id},function(err,count){
  if (err) throw err;
  if(count)
  {
    collection.count({'unique_identifier':unique_identifier},function(err,count1){
      if(!count1)
      {
	collection.update({_id : project_id},{'email':email,'unique_identifier':unique_identifier,'web_url' :web_url},function(err,data)
	{
	  if (err)throw err;
	  res.redirect('projectinfo/'+project_id);
	});
      }
      else
      {
	res.send('Project Already Exist');
      }
    });
  }
  else
  {
    res.status(404).send('Project Not Found');
  }
});
});


//saving new branch
router.post('/addbranch',function(req,res)
{
  var db = req.db;
  
  var project_id = req.body.project_id ;
  var branchname = req.body.branchname;
  var pathonserver = req.body.pathonserver;
  var friendlyservername = req.body.friendlyservername;
  var servername = req.body.servername;
  var web_url = req.body.web_url;
  
  var check_branchname = (/^[a-z0-9\_]{3,30}$/).test(branchname);
  var check_pathonserver = (/^[a-z0-9\/]{3,60}$/).test(pathonserver);
  var check_friendlyservername = (/^[a-z0-9\_]{3,30}$/).test(friendlyservername);
  var check_servername = validator.isNull(servername);
  var check_web_url = true;
  if(web_url!='')
  {
    var check_web_url = validator.isURL(web_url);
  }
  var collection = db.get('project');
  var server_collection = db.get('server');
  
  if(check_branchname && check_friendlyservername && check_pathonserver && !check_servername && check_web_url)
  {
    var ObjectID = require('mongodb').ObjectID;
    var server_id = new ObjectID(servername);
    var branch_id = new ObjectID();
    
    server_collection.count({_id: server_id},function(err,data){
      if(err) throw err;
      if(!data)
        res.status(404).send('Please Select A Valid Server');
      else
      {
        var brancharray = { 'branch_id': branch_id,'branchname' : branchname, 'pathonserver' : pathonserver , 'friendlyservername' : friendlyservername ,'web_url' : web_url, 'servername' : server_id};
        collection.update({'_id':project_id},{$push:{'branches': brancharray}} ,function(err,data)
        {
	  if (err) throw err;
	  res.redirect('/branchdetails/'+project_id);
        });
      }
    });
  }
  else
  {
    res.send('You have Entered The Incorrect Data');
  }
});


// adding a new server
router.post('/addserver', function(req, res)
{
  var db = req.db;
  var unique_identifier = req.body.unique_identifier;
  var host = req.body.hostip ;
  var port = req.body.portno;
  var username = req.body.username;
  var authmethod = req.body.authmethod;
  var auth_method;
  var authkey;
  
  if(authmethod == 1)
  {
    auth_method = "key";
    authkey = req.body.key ;
  }
  if(authmethod ==2)
  {
    auth_method = "password";
    authkey = req.body.password;
  }
  
  var check_unique_identifier = (/^[a-z0-9\_]{3,30}$/).test(unique_identifier);
  var check_host = validator.isIP(host);
  var check_port = validator.isNumeric(port);
  var check_username = (/^[a-zA-Z0-9\_]{3,30}$/).test(username);
  var check_authmethod = validator.isNull(authmethod);
  var check_authkey = validator.isNull(authkey);
  
  console.log(check_unique_identifier);
  console.log(check_host);
  console.log(check_port);
  console.log(check_username);
  console.log(check_authmethod);
  console.log(check_authkey);
  
  var collection = db.get('server');
  
  if(!check_authkey && !check_authmethod && check_username && check_port && check_host && check_unique_identifier)
  {
    collection.count({"server_identifier_name": unique_identifier},function(err,count)
    {
      if(!count)
      {
	collection.insert({
            "server_identifier_name" : unique_identifier,
            "host" : host,
            "port" : port,
            "username" : username,
            "auth_method": auth_method,
            "auth_value" : authkey,
            "date_added" : new Date()
        }, function (err, doc) {
            if (err)
            {
              res.send("There was a problem adding the information to the database.");
            }
	    else
	    {
	      res.redirect("projectlist");
	    }
        });
      }
      else
      {
	res.send('Server Already Exist');
      }
      });
  }
  else
  {
    res.send('You Entered Incorrect Data');
  }
});


//adding a user
router.post('/adduser', function(req, res)
{
  var db = req.db;

  var projectname = req.body.projectname;
  var servername = req.body.servername;
  var localpath = req.body.localpath;

  var collection = db.get('usercollection');
  console.log(collection);
  collection.insert({
      "projectname" : projectname,
      "servername" : servername,
      "localpath" : localpath
  }, function (err, doc) {
      if (err)
      {
	res.send("There was a problem adding the information to the database.");
      }
      else
      {
	res.redirect("userlist");
      }
  });
});

module.exports = router;
