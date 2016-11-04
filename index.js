'use strict';

var couchbase = require('couchbase');
var express = require('express');
var uuid = require('uuid');

// Connect to the local cluster and enable experimental CBAS support.
var cluster = new couchbase.Cluster('couchbase://localhost');
cluster.enableCbas(['localhost:8095']);

// Connect to the travel-sample bucket so we can insert some test data
var bucket = cluster.openBucket('travel-sample');

function setupCbasShadows(callback)
{
  var qs =
      'CREATE BUCKET tsBucket WITH {"name":"travel-sample","nodes":"127.0.0.1"};' +
      'CREATE SHADOW DATASET airlines ON tsBucket WHERE `type` = "airline";' +
      'CREATE SHADOW DATASET airports ON tsBucket WHERE `type` = "airport";' +
      'CREATE SHADOW DATASET hotels ON tsBucket WHERE `type` = "hotel";' +
      'CREATE SHADOW DATASET landmarks ON tsBucket WHERE `type` = "landmark";' +
      'CREATE SHADOW DATASET routes ON tsBucket WHERE `type` = "route";' +
      'CREATE SHADOW DATASET users ON tsBucket WHERE `type` = "user";' +
      'CONNECT BUCKET tsBucket WITH {"password":""};';

  var q = couchbase.CbasQuery.fromString(qs);
  cluster.query(q, function(err, res) {
    // We ignore errors here since they are usually just
    //  'bucket already exists'.
    callback(null);
  });
}

function insertRandomData(callback)
{
  var airlines = ['40-Mile Air', 'Texas Wings', 'Locair', 'Alaska Central Express'];
  var flights = ['AA130', 'AA111', 'AA284', 'AA155', 'AA019', 'AA784'];
  var airports = ['YYZ', 'YVR', 'LAS', 'SAN', 'LAX', 'SFO', 'LAG', 'NGZ', 'EKI'];

  function randomAirline() {
    return airlines[Math.floor(Math.random() * airlines.length)];
  }

  function randomFlight() {
    return flights[Math.floor(Math.random() * flights.length)];
  }

  function randomAirport() {
    return airports[Math.floor(Math.random() * airports.length)];
  }

  function randomPrice() {
    return Math.floor((Math.random() * 1000 + 100) * 100) / 100;
  }

  function randomDate() {
    var start = new Date(2016, 10, 1, 0, 0, 0, 0);
    var randTime = start.getTime() + Math.floor(Math.random() * (31 * 24 * 60 * 60 * 1000));
    return new Date(randTime);
  }


  var myUser = {
    name: uuid.v4(),
    password: "auto-gen-account",
    flights: [],
    type: 'user'
  };

  for (var i = 0; i < 1000; ++i) {
    var myFlight = {
      name: randomAirline(),
      flight: randomFlight(),
      price: randomPrice(),
      date: randomDate(),
      sourceairport: randomAirport(),
      destinationairport: randomAirport()
    };

    if (myFlight.sourceairport == myFlight.destinationairport) {
      --i;
      continue;
    }

    myUser.flights.push(myFlight);
  }

  var myUserKey = 'user::' + myUser.name;

  bucket.upsert(myUserKey, myUser, function(err) {
    if (callback) {
      callback(err);
    }
  });
}


setupCbasShadows(function(err) {
  if (err) {
    throw err;
  }
});

insertRandomData(function(err) {
  if (err) {
    throw err;
  }
});


var app = express();

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/pricestats', function(req, res) {
  var metric = 'COUNT(e.price)';
  if (req.query.metric === 'Price') {
    metric = 'SUM(e.price)';
  }

  var startDate = req.query.startDate;
  var endDate = req.query.endDate;

  var qs =
      'SELECT ' +
      '  parse_date(SUBSTR(e.date, 0, 10), "Y-M-D") AS grpdate, ' +
      '  ' + metric + ' AS metric ' +
      'FROM users u ' +
      '  UNNEST u.flights e ' +
      'WHERE parse_date(SUBSTR(e.date, 0, 10), "Y-M-D") >= parse_date("' + startDate + '", "Y-M-D") ' +
      '  AND parse_date(SUBSTR(e.date, 0, 10), "Y-M-D") < parse_date("' + endDate + '", "Y-M-D") ' +
      'GROUP BY grpdate ' +
      'ORDER BY grpdate;';

  var q = couchbase.CbasQuery.fromString(qs);
  cluster.query(q, function(err, qres) {
    if (err) {
      res.status(400).send(err);
      return;
    }

    res.send({
      data: qres,
      narration: [
        ['sql', qs]
      ]
    });
  });
});

app.get('/sourcestats', function(req, res) {
  var metric = 'COUNT(e.price)';
  if (req.query.metric === 'Price') {
    metric = 'SUM(e.price)';
  }

  var startDate = req.query.startDate;
  var endDate = req.query.endDate;

  var qs =
      'SELECT ' +
      '  e.sourceairport AS airport, ' +
      '  ' + metric + ' AS metric ' +
      'FROM users u ' +
      '  UNNEST u.flights e ' +
      'WHERE parse_date(SUBSTR(e.date, 0, 10), "Y-M-D") >= parse_date("' + startDate + '", "Y-M-D") ' +
      '  AND parse_date(SUBSTR(e.date, 0, 10), "Y-M-D") < parse_date("' + endDate + '", "Y-M-D") ' +
      'GROUP BY e.sourceairport ' +
      'ORDER BY metric DESC;';

  var q = couchbase.CbasQuery.fromString(qs);
  cluster.query(q, function(err, qres) {
    if (err) {
      res.status(400).send(err);
      return;
    }

    res.send({
      data: qres,
      narration: [
        ['sql', qs]
      ]
    });
  });
});

app.get('/deststats', function(req, res) {
  var metric = 'COUNT(e.price)';
  if (req.query.metric === 'Price') {
    metric = 'SUM(e.price)';
  }

  var startDate = req.query.startDate;
  var endDate = req.query.endDate;

  var qs =
      'SELECT ' +
      '  e.destinationairport AS airport, ' +
      '  ' + metric + ' AS metric ' +
      'FROM users u ' +
      '  UNNEST u.flights e ' +
      'WHERE parse_date(SUBSTR(e.date, 0, 10), "Y-M-D") >= parse_date("' + startDate + '", "Y-M-D") ' +
      '  AND parse_date(SUBSTR(e.date, 0, 10), "Y-M-D") < parse_date("' + endDate + '", "Y-M-D") ' +
      'GROUP BY e.destinationairport ' +
      'ORDER BY metric DESC;';

  var q = couchbase.CbasQuery.fromString(qs);
  cluster.query(q, function(err, qres) {
    if (err) {
      res.status(400).send(err);
      return;
    }

    res.send({
      data: qres,
      narration: [
        ['sql', qs]
      ]
    });
  });
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
