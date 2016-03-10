var express = require('express');
var router = express.Router();
var Redis = require('ioredis');
var config = require('../config');
var randtoken = require('rand-token');

var redis = new Redis({
    port: config.redis.port,
    host: config.redis.host,
    family: 4,
    password: config.redis.auth,
    db: 2
});

// to generate unique token;
var getRandToken = function(num, next) {
    var temp = randtoken.generate(num);
    redis.exists(temp, function(err, res) {
        if (res == 1) {
            getRandToken(num+1, next);
        } else {
            next(null, temp);
        }
    });
};
// save token-url into redis
var saveTokenUrl = function(err, token, url) {
    redis.set(token, url, 'EX', 7 * 24 * 3600);
    redis.set(url, token, 'EX', 7 * 24 * 3600);
};

// send token to user
var sendToken = function(err, res, token) {
    if (err) {
        console.log(err);
    } else {
        res.send(config.baseUrl + '/u/' + token);
    }
};

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index');
});
router.post('/geturl', function(req, res, next) {
    var longUrl = req.body.url;
    if (longUrl) {
        redis.exists(longUrl, function(err, result){
            if (result == 1) {
                redis.get(longUrl, function(err, token){
                    if (err) {
                        console.log(err);
                    } else {
                        if(token){
                            sendToken(null, res, token);
                        }
                    }
                });
            } else {
                getRandToken(6, function(err, token) {
                    saveTokenUrl(null, token, longUrl);
                    sendToken(null, res, token);
                });
            }
        });
    } else {
        res.send("err, url cannot be emtpy");
    }
});

router.get('/u/:token', function(req, res, next) {
    redis.get(req.params.token, function(err, result) {
        if (err) {
            console.log(err);
        } else {
            if (result) {
                res.redirect(result);
            } else {
                res.send('token已过期或错误.');
            }
        }
    });
});

module.exports = router;
