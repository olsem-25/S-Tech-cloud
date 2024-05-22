module.exports = function(RED) {
    // ************** Toggle *******************
     function ToggleNode(config){
        RED.nodes.createNode(this,config);
        const device = RED.nodes.getNode(config.device);
        device.setMaxListeners(device.getMaxListeners() + 1); // увеличиваем лимит для event
        const name = config.name;
        var id = '12345678_'+ this.id;     // ID умения по умолчанию
        const ctype = 'devices.capabilities.toggle';
        const node = this;
        var instance = config.instance;
        //this.response = config.response;
        var initState = false;
        //var value = false;
    
        //if (config.response === undefined){
        //    this.response = true;
        //}
        
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

        let capab = {};
        
        node.init = ()=>{
            capab = {
                type: ctype,
                retrievable: true,
                reportable: true,
                parameters: {
                    instance: instance
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

        // Установка значения
		device.on("Set Action",(cap, devid)=>{
			if (cap.type != ctype){
				return;
			}
			if ( !(cap.state.hasOwnProperty('value')) || typeof cap.state.value != 'boolean'){  // Проверяем входящуюю переменную ( boolian ли она )
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
    RED.nodes.registerType("ST-Toggle",ToggleNode);
};