const { Console } = require('console');

module.exports = function(RED) {
	function OnOffNode(config) {
        RED.nodes.createNode(this, config);
        const device = RED.nodes.getNode(config.device);
		device.setMaxListeners(device.getMaxListeners() + 1); // увеличиваем лимит для event
		var id = '12345678_'+ this.id;     // ID умения по умолчанию
		const ctype = 'devices.capabilities.on_off';
		const instance = 'on';
		const node = this;
		let initState = false;
		var currentState = {
			type:ctype,
			state:{
				instance: instance,
				value: false
			}
		};

		let ResponceState = {
			type:ctype,
			state:{
				instance: instance,
				action_result: {
					status : "" 
				}
			}
		};

		// Установка ID умения
		device.on("controller_serial", (controller_serial)=>{
			id = controller_serial + "_" + this.id;
		});

		// Есть подключение к облаку
		device.on("online",()=>{
			node.status({fill:"green",shape:"dot",text:"online"});
		});

		// Нет подключения к облаку
		device.on("offline",()=>{
			node.status({fill:"red",shape:"dot",text:"offline"});
		});

		// Установка значения
		device.on("Set Action",(capab, devid)=>{
			if (capab.type != ctype){
				return;
			}
			if ( !(capab.state.hasOwnProperty('value')) || typeof capab.state.value != 'boolean'){  // Проверяем входящуюю переменную ( boolian ли она )
				ResponceState.state.action_result.status = "ERROR";
				ResponceState.state.action_result.error_code = "INVALID_VALUE";
				device.ResponceState ( ResponceState, devid );
				return;
			}
			if ( !(capab.state.hasOwnProperty('instance')) || capab.state.instance != instance){// Проверяем функцию для данного умения
				ResponceState.state.action_result.status = "ERROR";
				ResponceState.state.action_result.error_code = "INVALID_ACTION";
				device.ResponceState ( ResponceState, devid );
				return;
			}			
			currentState.state.value = capab.state.value;
			ResponceState.state.action_result.status = "DONE";
			node.send({
				payload: currentState.state.value
			});
			node.status({fill:"green",shape:"dot", text:currentState.state.value.toString()}); 
			device.ResponceState ( ResponceState, devid );

		});

		node.on('input', (msg, send, done)=>{			
			if (typeof msg.payload != 'boolean'){   // Проверяем входящуюю переменную ( boolian ли она )
				node.error("Wrong type! msg.payload must be boolean.");
				if (done) {done();}
				return;
			};
			if (msg.payload == currentState.state.value){     // Может значение уже какое нужно?        
				node.debug("Value not changed. Cancel update");
				if (done) {done();}
				return;
			};
			currentState.state.value = msg.payload;
			node.send({
				payload: currentState.state.value
			});
			device.UpdateState(currentState);
			node.status({fill:"green",shape:"dot", text:currentState.state.value.toString()});
			if (done) {done();} 
		});
		
		// Статус ноды по умолчанию
		node.status({fill:"red",shape:"dot",text:"offline"});
		
		// Регистрация умения в устройстве
		const intrvl = setInterval(() => {
			if (device.GetInitStatus() == true){
				device.RegistryCapabilitieInfo({type:ctype});
				device.SetStatus(currentState);
				clearInterval(intrvl);
			}	
		}, 50)	

    }
    RED.nodes.registerType("ST-On/Off", OnOffNode);
}
