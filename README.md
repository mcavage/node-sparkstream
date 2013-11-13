# Installation

    npm install sparkstream

# Usage

```javascript
var sparkStream = require('sparkstream');

var spark = sparkStream.createStream({
    title: 'Foo Bar Baz'
});

spark.on('data', function (chunk) {
    console.log(chunk.toString('utf8'));
});

setTimeout(function next() {
    spark.write(Math.floor(Math.random() * 100) + '');
    if (i < 100000) {
        setTimeout(next, 20);
    } else {
        spark.end();
    }
}, 250);

```

# License

MIT.
