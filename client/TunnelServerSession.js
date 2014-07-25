var net = require("net");
var Tunnel = require("../lib/Tunnel.js");

function TunnelServerSession (server,connection){
    this.server = server;
    this.connection = connection;
    this.datalength = 0;
    this.buffers = [];
    this.handleData = this.handleData.bind(this)
    this.connection.on("data",this.handleData);
    this.connection.resume();
}

TunnelServerSession.prototype.handleConnection = function(connection){
    var lane = this.tunnel.createLane();
    connection.pipe(lane);
    lane.pipe(connection);
}

TunnelServerSession.prototype.start = function(config){
    if(config.password != this.server.password){
        this.connection.end();
        return;
    }
    this.server = net.createServer(this.handleConnection.bind(this));

    this.tunnel = new Tunnel(this.connection);
    this.tunnel.on("close",function(){
        this.tunnel = null;
        try{
            this.server.close();
        }catch(e){}

    }.bind(this));

    this.server.on("error",function(){
        try{
            this.server.close();
        }catch(e){}
    }.bind(this))

    this.server.listen(config.port);
    console.log("listening on port "+config.port);



}

TunnelServerSession.prototype.parseConfig = function(i){
    var buf = new Buffer(this.datalength);
    var index = 0;
    for(var j = 0; j < this.buffers.length; j++){
        this.buffers[j].copy(buf,index,0);
        index +=  this.buffers[j].length;
    }

    try{
        var config = JSON.parse(buf.slice(0,i).toString("utf8"));
    }catch(e){
        this.connection.end();
        return;
    }
    this.start(config);
}


TunnelServerSession.prototype.handleData = function(d){
    this.buffers.push(d);
    this.datalength += d.length;
    for(var i = 0; i < d.length; i++){
        if(d[i] == 10){
            this.connection.pause();
            if(i < d.length-1){
                this.connection.unshift(d.slice(i+1));
            }
            this.connection.removeListener("data",this.handleData);
            this.parseConfig(this.datalength-d.length+i);
            break;
        }
    }
}

module.exports = TunnelServerSession;
