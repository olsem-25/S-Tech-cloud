const { Console } = require('console');

module.exports = function(RED) {
    function RangeNode(config){
        RED.nodes.createNode(this,config);
        const device = RED.nodes.getNode(config.device);
        device.setMaxListeners(device.getMaxListeners() + 1); // увеличиваем лимит для event\
        var id = '12345678_'+ this.id;     // ID умения по умолчанию
        const node = this;
        //const name = config.name;
        var ctype = 'devices.capabilities.range';
        var retrievable = config.retrievable;
        var transmit_input_message = config.transmit_input_message;  // пресылать на выход входящее сообщение
        var instance = config.instance;
        var unit = config.unit;
        var random_access = true;
        var min = parseFloat(config.min);
        var max = parseFloat(config.max);
        var precision = parseFloat(config.precision);
        var initState = false;
        if (typeof min != 'number'){this.min = 0};
        if (typeof max != 'number'){this.max = 100};
        if (typeof precision != 'number'){this.precision = 1};


        let currentState= {
            type: ctype,
            state:{
              instance: instance,
              value: 0
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
              retrievable: retrievable,
              reportable: true,
              parameters: {
                instance: instance,
                unit: unit,
                random_access: random_access,
                range: {
                    min: min,
                    max: max,
                    precision: precision
                }
              }
            };
            // если unit не пременим к параметру, то нужно удалить 
            if ( unit == "unit.number" ){
               delete capab.parameters.unit;
            };
            initState = true;
            node.status({fill:"red",shape:"dot",text:"offline"});
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
            if ( !(capab.state.hasOwnProperty('value')) || capab.state.value == null || typeof capab.state.value != 'number'){  // Проверяем входную переменную ( number ли она )
				ResponceState.state.action_result.status = "ERROR";
				ResponceState.state.action_result.error_code = "INVALID_VALUE";
				device.ResponceState ( ResponceState, devid );
				return;
			}
			if ( !(capab.state.hasOwnProperty('instance')) || capab.state.instance != instance){	// Проверяем функцию для данного умения
				ResponceState.state.action_result.status = "ERROR";
				ResponceState.state.action_result.error_code = "INVALID_ACTION";
				device.ResponceState ( ResponceState, devid );
				return;
			}
            let val = capab.state.value;
            if (capab.state.relative == true || (!random_access)){
                currentState.state.value = Number(currentState.state.value) + Number(val);     
            }
            else {
                if ((Number(val) > max)||(Number(val) < min)) { // Проверяем входную переменную на вхождение в допустимый диапазон  
                    ResponceState.state.action_result.status = "ERROR";
				    ResponceState.state.action_result.error_code = "INVALID_VALUE";
				    device.ResponceState ( ResponceState, devid );
				    return;
                }
			    currentState.state.value = Number(val);
            }
            if (currentState.state.value < min) currentState.state.value = min;
            if (currentState.state.value > max) currentState.state.value = max;
			ResponceState.state.action_result.status = "DONE";
            node.send({
				payload: Number(currentState.state.value)
			});
			node.status({fill:"green",shape:"dot", text:currentState.state.value.toString()}); 
			device.ResponceState ( ResponceState, devid );
		});

        this.on('input', (msg, send, done)=>{			
			if (typeof msg.payload != 'number'){   // Проверяем входную переменную ( number ли она )
			 	node.error("Wrong type! msg.payload must be number.");
			 	if (done) {done();}
			 	return;
			};

			if (msg.payload == currentState.state.value){     // Может значение уже установлено?        
			 	node.debug("Value not changed. Cancel update");
			 	if (done) {done();}
			 	return;
			};

			currentState.state.value = msg.payload;
			// node.send({
			//  	payload: currentState.state.value
			// });
            if (transmit_input_message === true) {node.sendmsg (currentState.state);}
			device.UpdateState(currentState);
			node.status({fill:"green",shape:"dot", text:currentState.state.value.toString()});
			if (done) {done();} 
		});

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
    RED.nodes.registerType("ST-Range", RangeNode);
}