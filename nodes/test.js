module.exports = function(RED) {
    function TestNode(config) {
        RED.nodes.createNode(this, config);
        const cloud = RED.nodes.getNode(config.cloud);
    
		this.on('input', (msg, send, done)=>{
			cloud.InputMessage( msg );
			if (done) {done();}
		});
	
	}
    RED.nodes.registerType("Test", TestNode);
}
