var assert = require('assert');
var util = require('util');

var spark_stream = require('../');



///--- Globals

var sprintf = util.format;

var K_CACHE = [];



///--- Helpers

function rand(ceil) {
    var n = Math.floor(Math.random() * (ceil || 100));

    return (n);
}


function rand_str() {
    var DICT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var N = 100;
    var STR = '/mark/stor/%s.cpu_zone.nsec_waitrq:%d|g';
    var tmp = '';

    if (K_CACHE.length < N) {
        for (var i = 0; i < 5; i++)
            tmp += DICT.charAt(Math.floor(Math.random() * DICT.length));

        K_CACHE.push(tmp);
    } else {
        tmp = K_CACHE[rand(N)];
    }

    return (sprintf(STR, tmp, rand()));
}



///--- Test

(function test() {
    var i = 0;
    var spark = spark_stream.createStream({
        parse: function parse(msg) {
            var components = msg.split('.');
            var name = components[0];
            var val = components[components.length - 1];
            var n = val.split('|').shift().split(':').pop();

            return ({
                prefix: name + ': ',
                val: n
            });
        },
        title: 'Foo Bar Baz'
    });

    spark.on('data', function (chunk) {
        console.log(chunk.toString('utf8'));
    });

    setTimeout(function next() {
        spark.write(rand_str());
        if (i < 100000) {
            setTimeout(next, 20);
        } else {
            spark.end();
        }
    }, 250);
})();
