var express = require('express');
var router = express.Router();
// var async = require('asyncawait/async');
// var await = require('asyncawait/await');

var redis = require("redis");
var client = redis.createClient();

var fs = require('fs');

// get data from redis
var get_data = function (callback) {
  var r = {};

  client.hgetall('temperature', function(err, result){
    r.temperature = result;

    client.hgetall('pressure', function(err, result){
      r.pressure = result;

        client.get('avg_temperature', function(err, result){
          r.avg_temperature = result;

          client.get('avg_pressure', function(err, result){
            r.avg_pressure = result;

            callback(r);
          });
        });
    });
  });
};

var temperature_color = function (value) {
  value = Math.round(value);
  if (value < 25) {
    return 'lightblue';
  } else if (value < 29) {
    return 'lightgreen';
  } else {
    return 'lightyellow';
  }
};

var pressure_color = function (value) {
  if (value < 700) {
    return 'lightblue';
  } else if (value < 750) {
    return 'lightgreen';
  } else {
    return '#FFFF33';
  }
};

var time_converter = function (UNIX_timestamp){
  var a = new Date(UNIX_timestamp*1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
};

var sort_object = function (object) {
  var sorted_object = {};
  var keys = Object.keys(object);
  var len = keys.length;

  keys.sort();

  for (var i = 0; i < len; i++) {
      k = keys[i];
      sorted_object[k] = object[k];
  }

  return sorted_object;

};


/* GET home page. */
router.get('/', function(req, res, next) {
  get_data(function(r) {
    var date = 0;
    var temperature = 0;
    var pressure = 0;
    for (var i in r.temperature) {
      if (i > date) {
        date = i;
        temperature = r.temperature[i];
      }
    }

    date = 0;
    for (var i in r.pressure) {
      if (i > date) {
        date = i;
        pressure = r.pressure[i];
      }
    }

    r.temperature = temperature;
    r.pressure = pressure;
    r.timestamp = time_converter(date);

    r.temperature_color = temperature_color(r.temperature);
    r.avg_temperature_color = temperature_color(r.avg_temperature);
    r.pressure_color = pressure_color(r.pressure);
    r.avg_pressure_color = pressure_color(r.avg_pressure);

    res.render('index', {
      title: 'Data from sensors',
      result: r,
      active: 'index'
    });
  });
});

router.get('/temperature', function(req, res, next) {
  get_data(function(r) {
    var time = [];
    var data = [];
    var timestamps = [];
    var lasttime = 0;
    var temp_data = sort_object(r.temperature);

    for (var i in temp_data) {
      if ((i - lasttime) >= 120) {
        lasttime = i;
        time.push(time_converter(i));
        timestamps.push(i);
        data.push(temp_data[i]);
      }
    }

    // data for Chart.js
    var data = {
      timestamps: timestamps,
      labels: time,
      datasets: [
        {
          label: "Temperature",
          fillColor: "rgba(220,220,220,0.2)",
          strokeColor: "rgba(220,220,220,1)",
          pointColor: "rgba(220,220,220,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(220,220,220,1)",
          data: data
        },
      ]
    };

    res.render('temperature', {
      title: 'Temperature data',
      data: JSON.stringify(data),
      result: {
        temperature_color: temperature_color(temp_data[lasttime]),
        temperature: temp_data[lasttime],
        avg_temperature_color: temperature_color(r.avg_temperature),
        avg_temperature: r.avg_temperature,
      },
      active: 'temperature'
    });

  });
});

router.get('/temperature/refresh', function(req, res, next) {
  var r = {};
  client.hgetall('temperature', function(err, result){
    r.temperature = result;

    client.get('avg_temperature', function(err, result){
      r.avg_temperature = result;
      var date = 0;
      var temperature = 0;
      for (var i in r.temperature) {
        if (i > date) {
          date = i;
          temperature = r.temperature[i];
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(
        {
          timestamp: date,
          avg_temperature: Math.floor(r.avg_temperature),
          temperature: Math.floor(temperature)
          // code in the comments can be used to test in offline mode
          // timestamp: new Date().getTime(),
          // avg_temperature: Math.floor((Math.random() * 30) + 1),
          // temperature: Math.floor((Math.random() * 30) + 1)
        }
      ));
    });

  });
});

router.get('/pressure', function(req, res, next) {
  get_data(function(r) {
    var time = [];
    var data = [];
    var timestamps = [];
    var lasttime = 0;
    var temp_data = sort_object(r.pressure);

    for (var i in temp_data) {
      if ((i - lasttime) >= 120) {
        lasttime = i;
        time.push(time_converter(i));
        timestamps.push(i);
        data.push(temp_data[i]);
      }
    }

    // data for Chart.js
    var data = {
      timestamps: timestamps,
      labels: time,
      datasets: [
        {
          label: "Pressure",
          fillColor: "rgba(220,220,220,0.2)",
          strokeColor: "rgba(220,220,220,1)",
          pointColor: "rgba(220,220,220,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(220,220,220,1)",
          data: data
        },
      ]
    };

    res.render('pressure', {
      title: 'Pressure data',
      data: JSON.stringify(data),
      result: {
        pressure_color: pressure_color(temp_data[lasttime]),
        pressure: temp_data[lasttime],
        avg_pressure_color: pressure_color(r.avg_pressure),
        avg_pressure: r.avg_pressure,
      },
      active: 'pressure'
    });

  });
});

router.get('/pressure/refresh', function(req, res, next) {
  var r = {};
  client.hgetall('pressure', function(err, result){
    r.pressure = result;

    client.get('avg_pressure', function(err, result){
      r.avg_pressure = result;
      var date = 0;
      var pressure = 0;
      for (var i in r.pressure) {
        if (i > date) {
          date = i;
          pressure = r.pressure[i];
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(
        {
          timestamp: date,
          avg_pressure: Math.floor(r.avg_pressure),
          pressure: Math.floor(pressure)
          // code in the comments can be used to test in offline mode
          // timestamp: new Date().getTime(),
          // avg_pressure: Math.floor((Math.random() * 600) + 300),
          // pressure: Math.floor((Math.random() * 600) + 300)
        }
      ));
    });

  });
});

router.get('/about', function(req, res, next) {
  res.render('about', {
    title: 'About me',
    active: 'about'
  });
});

router.get('/errors', function(req, res, next) {
  // fs.readFile('/var/log/sensor-daemon.log', 'utf8', function (err, data) {
  fs.readFile('/var/log/dpkg.log', 'utf8', function(err, data) {
    if (err) {
      return console.log(err);
    }
    // console.log(data);
    res.render('errors', {
      title: 'Errors tracker',
      active: 'errors',
      data: data
    });
  });

});


module.exports = router;
