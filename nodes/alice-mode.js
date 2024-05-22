module.exports = function(RED) {
    // ************** Modes  *******************
    function ModeNode(config){
        RED.nodes.createNode(this,config);
        const device = RED.nodes.getNode(config.device);
        //const name = config.name;
        const node = this;
        const ctype = 'devices.capabilities.mode';
        var retrievable = true;
        var random_access = true;
        //var response = config.response;
        var instance = config.instance;
        var modes = config.modes;
        var initState = false;
        
      
        var currentState = {
			type:ctype,
			state:{
				instance: instance,
				value: modes[0]
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
        
        let capab = {};
    
        node.init = ()=>{
            var cfgModes = [];
            modes.forEach(v=>{
                cfgModes.push({value:v});
            });
            capab = {
                type: ctype,
                retrievable: retrievable,
                reportable: true,
                parameters: {
                  instance: instance,
                  modes: cfgModes
                }
            };
            initState = true;    
        }

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
    
        
        device.on("Set Action",(cap, devid)=>{
			if (cap.type != ctype){
				return;
			}
			if ( !(cap.state.hasOwnProperty('value')) || modes.indexOf(cap.state.value) == -1){  // Проверяем входящий mode, есть ли такой
				ResponceState.state.action_result.status = "ERROR";
				ResponceState.state.action_result.error_code = "INVALID_VALUE";
				device.ResponceState ( ResponceState, devid );
				return;
			}
			if ( !(cap.state.hasOwnProperty('instance')) || cap.state.instance != instance){// Проверяем функцию для данного умения
				ResponceState.state.action_result.status = "ERROR";
				ResponceState.state.action_result.error_code = "INVALID_ACTION";
				device.ResponceState ( ResponceState, devid );
				return;
			}			
			currentState.state.value = cap.state.value;
			ResponceState.state.action_result.status = "DONE";
			node.send({
				payload: currentState.state.value
			});
			node.status({fill:"green",shape:"dot", text:currentState.state.value.toString()}); 
			device.ResponceState ( ResponceState, devid );

		});


        node.on('input', (msg, send, done)=>{			
			if (modes.indexOf(msg.payload) == -1){ // Проверяем входящий mode, есть ли такой
                node.error("Wrong type! msg.payload must be one of the mode options");
				if (done) {done();}
				return;
            }            
			if (msg.payload == currentState.state.value){     // Может значение уже какое нужно?        
				node.debug("Value not changed. Cancel update");
				if (done) {done();}
				return;
			};
			currentState.state.value = msg.payload;
			// node.send({
			// 	payload: currentState.state.value
			// });
			device.UpdateState(currentState);
			node.status({fill:"green",shape:"dot", text:currentState.state.value.toString()});
			if (done) {done();} 
		});

        // Статус ноды по умолчанию
        node.status({fill:"red",shape:"dot",text:"offline"});

        // Инициализация
        node.init();

        // Регистрация умения в устройстве
        const intrvl = setInterval(() => {
            if (device.GetInitStatus() == true && initState){
                device.RegistryCapabilitieInfo(capab);
                device.SetStatus(currentState);
                clearInterval(intrvl);
            }	
        }, 50)	

    }
    RED.nodes.registerType("ST-Mode", ModeNode);
};  