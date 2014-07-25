var net = require("net");
var config = require("./config.js");
var Tunnel = require("./Tunnel.js");

function TunnelClient(localport,remoteport,host,password){
    this.localport = localport;
    this.connect(remoteport,host,password);
}

TunnelClient.prototype.connect = function(port,host,password){
    this.connection = net.connect(config.port,host,function(){
        this.connection.write(JSON.stringify({port:port,password:password})+"\n");
        this.tunnel = new Tunnel(this.connection);
        this.tunnel.on("lane",this.handleLane.bind(this));
    }.bind(this));
}

TunnelClient.prototype.handleLane = function(lane){
    var connection = net.connect(this.localport,function(){
        connection.pipe(lane);
        lane.pipe(connection);
    }.bind(this));
}


module.exports = TunnelClient;
