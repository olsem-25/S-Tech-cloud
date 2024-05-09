module.exports = function(RED) {
    // ************** ON/OFF *******************
    function EventNode(config){
        RED.nodes.createNode(this,config);
        const device = RED.nodes.getNode(config.device);
        device.setMaxListeners(device.getMaxListeners() + 1); // увеличиваем лимит для event
        var id = '12345678_'+ this.id; 
        //const name = config.name;
        const node = this;
        const stype = 'devices.properties.event';
        const instance = config.instance;
        const reportable = true;
        const retrievable = false;
        const events = config.events;
        let initState = false;
        let currentState = {
          type:stype,
          state:{
            instance: instance,
            value: ''
          }
        };
        
        let event;
        
        node.init = ()=>{
            let objEvents=[]
            events.forEach(v => {
                objEvents.push({value:v})
            });
            event = {
                type: stype,
                reportable: reportable,
                retrievable: retrievable,
                parameters: {
                    instance: instance,
                    events: objEvents
                }
            }
            initState = true;
            this.status({fill:"red",shape:"dot",text:"offline"});
        }

           
        this.on('input', (msg, send, done)=>{	
            if (events.indexOf(msg.payload) == -1){ // Проверяем входящий event, есть ли такой
                node.error("Wrong type! msg.payload must be one of the mode options");
                if (done) {done();}
                return;
            } 		
            if (msg.payload == currentState.state.value){     // Может значение уже установлено?        
                node.debug("Value not changed. Cancel update");
                if (done) {done();}
                return;
            };
            currentState.state.value = msg.payload;
            device.UpdateSensorValue(currentState);
            node.status({fill:"green",shape:"dot", text:currentState.state.value.toString()});
            if (done) {done();} 
        });
        
        
        // Установка ID свойства
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
    
        // Инициализация
        node.init();

        // Регистрация свойства в устройстве
		const intrvl = setInterval(() => {
			if (device.GetInitStatus() == true && initState){
				device.RegistryPropertiesInfo(event);
				device.SetProperties(currentState);
				clearInterval(intrvl);
			}	
		}, 50)	
    }  
    RED.nodes.registerType("ST-Event",EventNode);
};