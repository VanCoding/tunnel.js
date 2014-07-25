var Duplex = require("stream").Duplex;
var util = require("util");

function Lane(tunnel,id){
    Duplex.call(this);
    this.tunnel = tunnel;
    this.id = id;
}
util.inherits(Lane,Duplex);

Lane.prototype._write = function(buffer,encoding,cb){
    if(buffer && !(buffer instanceof Buffer)) buffer = new Buffer(buffer,encoding);
    this.tunnel.write({
        lane:this,
        buffer:buffer,
        cb:cb
    });
}
Lane.prototype._read = function(size){
}


module.exports = Lane;
