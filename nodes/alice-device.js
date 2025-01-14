const { Console } = require('console');

module.exports = function(RED) {
    function DeviceNode(config) {
		const pjson = require('../package.json');
		
		RED.nodes.createNode(this, config);
				
		var id = '12345678_'+ this.id;

		const cloud = RED.nodes.getNode(config.cloud);
		cloud.setMaxListeners(cloud.getMaxListeners() + 1); // увеличиваем лимит для event

		var node = this;

		let deviceconfig = {
			id: id,
			name: config.name,
			description: config.description,
			room: config.room,
			type: config.dtype,
			device_info:{
				manufacturer: "S-Tech",
				model: "",
				sw_version: pjson.version
			},
			capabilities:[],
			properties:[]
		};

		let states = {
			id: id,
			capabilities: [],
			properties: []
		};
		
		let cap;

		let ResponceState = {
			id: id,
			capabilities: []
		}

		let Capabilities = new Array();

		let initdevice = false;
		
		function CheckCapabilities(ctype){
			let retval = false;
			deviceconfig.capabilities.forEach(function(capp){
				if (capp.type == ctype) {
					retval = true;
				}
			})
			return retval;
		}

		cloud.on("online",()=>{
			node.emit("online");
		});

		cloud.on("offline",()=>{
			node.emit("offline")
		});

		cloud.on("controller_serial", (controller_serial)=>{
			node.controller_serial = controller_serial;
			id = controller_serial + "_" + this.id;
			states.id = id;
			deviceconfig.id = id;
			node.emit("controller_serial", controller_serial);
		});

		cloud.on ("Get Info",(dev, model)=>{
			if (dev === id ) {
			    deviceconfig.device_info.model ="Controller : " + model + ",  " + config.modeltype; 	
			   	cloud.AddDevInfo (deviceconfig);
		    }
	    });

		cloud.on ("Get State",(dev)=>{
			if (dev.id == id ) {
			   cloud.AddDevState (states);
		   	}
	    });

		cloud.on ("Set State",(dev)=>{
			if (dev.id == id) {
				ResponceState = {};   // Очищаем обьект со статусом предназначенный для ответа
				Capabilities = [];		// Очищаем массив умений	
				cap = dev.capabilities.length; // получаем количество умений для измения
				dev.capabilities.forEach(function(devcp){     // перебираем умения которые необходимо изменить 
					if (CheckCapabilities(devcp.type) == true){   // Проверяем есть ли запрашиваемое умение у данного устройства
						node.emit ("Set Action", devcp, id);
					}
					else{
						ResponceState.id = dev.id;
						let capat = { 
							type : devcp.type, state : { 
								instance : devcp.state.instance, action_result : { 
									status : 'ERROR', "error_code": "INVALID_ACTION"
								}
							}
						};
						Capabilities.push(capat);
						cap = cap - 1;
						if ( cap < 1 ){
							ResponceState.capabilities = Capabilities;
							cloud.ResponceState (ResponceState);
						}
					}
				})
		   	}
	    });
		
		node.GetInitStatus = () =>{
			return initdevice;
		}
				
		node.RegistryCapabilitieInfo = (data) =>{
			deviceconfig.capabilities.push(data); 
		};

		node.RegistryPropertiesInfo = (data) =>{
			deviceconfig.properties.push(data); 
		};

		node.SetStatus = (data) =>{
			states.capabilities.push(data);
		};

		node.SetProperties = (data) =>{
			states.properties.push(data);
		};

		node.ResponceState = ( data, devid ) =>{	
			ResponceState.id = devid;
			Capabilities.push(data);
			cap = cap - 1;
			if ( cap < 1 ){
				ResponceState.capabilities = Capabilities;
				cloud.ResponceState (ResponceState);
			}	
		};

		node.UpdateState = (currentState) =>{
			let UpdateState = {
				id: id,
				capabilities: []
			}			
			UpdateState.id = id;
			let Capab = new Array();
			Capab.push(currentState);
			UpdateState.capabilities = Capab;
			cloud.UpdateStateDevice (UpdateState);			
		};

		node.UpdateSensorValue = (currentState) =>{
			let UpdateState = {
				id: id,
				properties: []
			}			
			UpdateState.id = id;
			let Prop = new Array();
			Prop.push(currentState);
			UpdateState.properties = Prop;
			cloud.UpdateStateDevice (UpdateState);			
		};
				
		const intrvl = setInterval(() => {
			if (global.Flow_Cloud_loaded === true){
				cloud.AddDevice(id);
				initdevice = true;
				clearInterval(intrvl);
			}	
		}, 50)		
		
   	}
    RED.nodes.registerType("ST-device", DeviceNode);
}
