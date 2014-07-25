var Lane = require("./Lane.js");
var events = require("events");
var util = require("util");

function Tunnel(stream){
    this.stream = stream;
    this.nextLaneId = 0;
    this.lanes = {};

    this.writeQueue = [];
    this.writing = false;

    this.readbuffer = new Buffer(0);
    this.readphase = 0; //0 = read lane id, 1= read data length, 2= read data
    this.readindex = 0;
    this.laneid = 0;
    this.datalength = 0;

    this.stream.on("drain",this.endWrite.bind(this));
    this.stream.on("data",this.onData.bind(this));
    this.stream.on("error",this.onEnd.bind(this));
    this.stream.on("end",this.onEnd.bind(this));
    this.stream.resume();
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

Tunnel.prototype.onData = function(d){
    var b = new Buffer(this.readbuffer.length+d.length);
    this.readbuffer.copy(b,0);
    d.copy(b,this.readbuffer.length);
    this.readbuffer = b;
    this.parse();
    this.readbuffer = this.readbuffer.slice(this.readindex);
    this.readindex = 0;
}


Tunnel.prototype.onEnd = function(){
    for(var id in this.lanes){
        var lane = this.lanes[id];
        lane.push(null);
    }
    this.emit("close");
}

Tunnel.prototype.parse = function(){
    switch(this.readphase){
        case 0:
            if(this.readbuffer.length-this.readindex >= 2){
                this.laneid = this.readbuffer.readUInt16BE(this.readindex);
                this.readindex += 2;
                this.readphase = 1;
                this.parse();
            }
            break;
        case 1:
            if(this.readbuffer.length-this.readindex >= 2){
                this.datalength = this.readbuffer.readUInt16BE(this.readindex);
                this.readindex += 2;
                this.readphase = 2;
                this.parse();
            }
            break;
        case 2:
            if(this.readbuffer.length-this.readindex >= this.datalength){
                var lane = this.lanes[this.laneid];
                if(!lane) lane = this.createLane(this.laneid);
                if(this.datalength){
                    var pause = !lane.push(this.readbuffer.slice(this.readindex,this.datalength));
                }else{
                    var pause = false;
                    lane.push(null);
                }
                this.readphase = 0;
                this.readindex += this.datalength;
                if(pause){

                    this.stream.pause();
                    lane.once("drain",function(){
                        this.stream.resume();
                        this.parse();
                    }.bind(this))
                }else{
                    this.parse();
                }
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
