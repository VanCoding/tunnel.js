var Duplex = require("stream").Duplex;
var util = require("util");

function Lane(tunnel,id){
    Duplex.call(this);
    this.tunnel = tunnel;
    this.id = id;
}
util.inherits(Lane,Duplex);

var maxBlock = 65536;

Lane.prototype._write = function(buffer,encoding,cb){
    var self = this;
    if(buffer && !(buffer instanceof Buffer)) buffer = new Buffer(buffer,encoding);

    if(buffer){
        var index = 0;
        function write(){
            if(index+maxBlock >= buffer.length){
                var b = buffer.slice(index);
            }else{
                var b = buffer.slice(index,index+maxBlock);
            }
            index += b.length;

            self.tunnel.write({
                lane:self,
                buffer:b,
                cb:function(){
                    if(index == buffer.length){
                        cb();
                    }else{
                        write();
                    }
                }
            });
        }

        write();
    }else{
        self.tunnel.write({lane:self,buffer:null,cb:cb});
    }

}






Lane.prototype._read = function(size){
}


module.exports = Lane;
