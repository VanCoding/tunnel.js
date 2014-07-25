var Lane = require("./Lane.js");
var events = require("events");
var util = require("util");

function Tunnel(stream){
    this.stream = stream;
    this.nextLaneId = 0;
    this.lanes = {};

    this.writeQueue = [];
    this.writing = false;

    this.readphase = 0; //0 = read lane id, 1= read data length, 2= read data
    this.laneid = 0;
    this.datalength = 0;

    this.stream.on("drain",this.endWrite.bind(this));
    this.stream.on("error",this.onEnd.bind(this));
    this.stream.on("end",this.onEnd.bind(this));

    this.parse();

}

util.inherits(Tunnel,events.EventEmitter);

Tunnel.prototype.write = function(writerequest){
    this.writeQueue.push(writerequest);
    if(!this.writing){
        this.startWrite();
    }
}

Tunnel.prototype.startWrite = function(){
    this.writing = true;
    var continue_writing = false;
    for(var i = 0; i < this.writeQueue.length; i++){
        var item = this.writeQueue[i];
        var header = new Buffer(4);
        header.writeUInt16BE(item.lane.id,0);
        header.writeUInt16BE(item.buffer?item.buffer.length:0,2);
        continue_writing = this.stream.write(header);
        if(item.buffer){
            continue_writing = this.stream.write(item.buffer,item.encoding);
        }
    }
    if(continue_writing){
        this.endWrite();
    }
}

Tunnel.prototype.endWrite = function(){
    var writeQueue = this.writeQueue;
    this.writeQueue = [];
    for(var i = 0; i < writeQueue.length; i++){
        writeQueue[i].cb();
    }
    this.writing = false;
    if(this.writeQueue.length) this.startWrite();
}

Tunnel.prototype.onEnd = function(){
    for(var id in this.lanes){
        var lane = this.lanes[id];
        lane.push(null);
    }
    this.emit("close");
}

Tunnel.prototype.getData = function(){
    this.stream.once("readable",this.parse.bind(this));
}

Tunnel.prototype.parse = function(){
    switch(this.readphase){
        case 0:
            var d = this.stream.read(2)
            if(d){
                this.laneid = d.readUInt16BE(0);
                this.readphase = 1;
                this.parse();
            }else{
                this.getData();
            }
            break;
        case 1:
            var d = this.stream.read(2);
            if(d){
                this.datalength = d.readUInt16BE(0);
                this.readphase = 2;
                this.parse();
            }else{
                this.getData();
            }
            break;
        case 2:
            var d = this.stream.read(this.datalength);
            if(d){
                var lane = this.lanes[this.laneid];
                if(!lane) lane = this.createLane(this.laneid);
                if(this.datalength){
                    lane.push(d);
                }else{
                    lane.push(null);
                }
                this.readphase = 0;
                this.parse();

            }else{
                this.getData();
            }
            break;

    }
}


Tunnel.prototype.createLane = function(id){
    var lane = new Lane(this,id||this.nextLaneId++);
    this.lanes[lane.id] = lane;
    this.emit("lane",lane);
    return lane;
}
Tunnel.prototype.removeLane = function(lane){
    delete this.lanes[lane.id];
}

Tunnel.prototype.close = function(){
    this.stream.end();
    this.writing = true;
}

module.exports = Tunnel;
