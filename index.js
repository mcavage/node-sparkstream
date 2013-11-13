var exec = require('child_process').exec;
var stream = require('stream');
var tty = require('tty');
var util = require('util');



///--- Globals

var CLEAR = new Buffer('\033[H\033[2J');
var TICKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
var T_SZ = Buffer.byteLength(TICKS[0]);



///--- API

function SparkStream(opts) {
    if (!process.stdout.isTTY)
        throw new Error('stdout must be a TTY');

    var self = this;

    stream.Transform.call(this, opts);
    opts = opts || {};

    function term() {
        self.columns = Math.min(process.stdout.columns,
                                (opts.columns || Infinity));
        self.rows = Math.min(process.stdout.rows,
                             (opts.rows || Infinity));
        self.title = (opts.title || '');

        var n = Buffer.byteLength(self.title);
        var c = Math.floor(n / 2);
        var pad = Math.floor(self.columns / 2) - c;
        var spc = ''
        for (var i = 0; i < pad; i++)
            spc += ' ';

        self.title = spc + self.title + '\n\n';
        self.t_len = Buffer.byteLength(self.title);
    }

    this.clear = opts.clear === undefined ? true : opts.clear;
    this.min = opts.min || 0;
    this.max = opts.max || 100;
    this.rings = {};
    this.ring_keys = [];
    this.parse = opts.parse || function _parse(s) {
        return ({
            prefix: '',
            val: parseInt(s, 10)
        });
    };

    this.f = ~~(((this.max - this.min) << 8) / (TICKS.length - 1));
    if (this.f < 1)
        this.f = 1;

    term();
    process.stdout.on('resize', term);
}
util.inherits(SparkStream, stream.Transform);


SparkStream.prototype._append = function _append(k, n) {
    if (!this.rings[k]) {
        if (this.ring_keys.length >= (this.rows - 5))
            return (false);

        this.rings[k] = [];
        this.ring_keys.push(k);
    }

    r = this.rings[k];

    if ((this.rings[k].length + k.length) === this.columns)
        this.rings[k].shift();
    this.rings[k].push(n);

    return (true);
};


SparkStream.prototype._transform = function _transform(chunk, encoding, cb) {
    if (Buffer.isBuffer(chunk))
        chunk = chunk.toString('utf8');

    var buf;
    var k;
    var len = this.t_len;
    var n;
    var off = 0;
    var p;
    var self = this;

    // First we figure out our mapping. name + spark tick, then we
    // grab the current ring of previous spark ticks, and slide it
    // along by adding this guy
    p = this.parse(chunk);
    if (!p) {
        cb();
        return;
    }

    k = p.prefix || '';
    n = TICKS[~~(((p.val - this.min) << 8) / this.f)];
    if (!this._append(k, n)) {
        cb();
        return;
    }

    // Next we need to figure out what the $row most frequently
    // touched lines were, and we:
    // - write an escape sequence to clear the screen
    // - write a row per topN of the spark line

    this.ring_keys.forEach(function (rk) {
        var r = self.rings[rk];
        len += (r.length * T_SZ) + Buffer.byteLength(rk + '\n');
    });

    buf = new Buffer(len);
    buf.fill(0);

    off += buf.write(this.title, off);

    this.ring_keys.forEach(function (rk) {
        var r = self.rings[rk];
        off += buf.write(rk, off);
        for (var i = 0; i < r.length; i++) {
            if (r[i])
                off += buf.write(r[i], off);
        }
        off += buf.write('\n', off);
    });

    if (this.clear)
        buf = Buffer.concat([CLEAR, buf]);

    this.push(buf);
    cb();
};


SparkStream.prototype._flush = function _flush(cb) {
    cb();
};



///--- API

module.exports = {
    SparkStream: SparkStream,
    createStream: function createStream(opts) {
        return (new SparkStream(opts));
    }
};
