var net = require("net");
var config = require("./config");
var TunnelServerSession = require("./TunnelServerSession.js");

function TunnelServer(password){
    this.password = password;
    this.server = net.createServer(this.handleConnection.bind(this));
}

TunnelServer.prototype.handleConnection = function(c){
    new TunnelServerSession(this,c);
}

TunnelServer.prototype.start = function(){
    this.server.listen(config.port);
}

TunnelServer.prototype.stop = function(){
    this.server.close();
}

module.exports = TunnelServer;
