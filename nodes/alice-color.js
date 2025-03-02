const { Console } = require('console');

module.exports = function(RED) {
    function ColorNode(config){
        RED.nodes.createNode(this,config);
        const device = RED.nodes.getNode(config.device);
        device.setMaxListeners(device.getMaxListeners() + 1); // увеличиваем лимит для event\
        var id = '12345678_'+ this.id;     // ID умения по умолчанию
        const node = this;
        //name = config.name;
        const ctype = 'devices.capabilities.color_setting';
        var instance = 'color_model';
        var color_support = config.color_support;
        var scheme = config.scheme;
        var temperature_k = config.temperature_k;
        var temperature_min = parseInt(config.temperature_min);
        var temperature_max = parseInt(config.temperature_max);
        color_scene = config.color_scene || [];
        var needConvert = false;
        //response = config.response;
        var initState = false;
        var reportable = true;
        var retransmit_message = config.retransmit_message;
        //value;
    
        if (scheme == "rgb_normal"){
            scheme = "rgb";
            needConvert = true;
        };
        if (config.response === undefined){
            response = true;
        };
        if (config.color_support === undefined){
            color_support = true
        };
    
        var capab = {};

        let currentState= {
            type: ctype,
            state:{
              instance: scheme
            }
        };

        let ResponceState = {
			type:ctype,
			state:{
                instance: "",
				action_result: {
					status : "" 
				}
			}
		};

        node.init = ()=>{
            var value = 0;
            if (scheme=="hsv"){
                value = {
                    h:0,
                    s:0,
                    v:0
                };
            }; 

            currentState.state.value = value;

            capab = {
                type: ctype,
                retrievable: true,
                reportable: reportable,
                parameters: {
                    // instance: this.scheme,//this.instance,
                    // color_model: this.scheme
                }   
            }
            if (!color_support && !temperature_k && color_scene.length<1){
                node.error("Error on create capability: " + "At least one parameter must be enabled");
                node.status({fill:"red",shape:"dot",text:"error"});
                return;
            };
            if (color_scene.length>0){
                scenes = [];
                color_scene.forEach(s=>{
                    scenes.push({id:s});
                });
                capab.parameters.color_scene = {
                    scenes:scenes
                };
              // capab.state.instance = 'scene';
              // capab.state.value = this.color_scene[0];
            };
            if (color_support){
                capab.parameters.color_model = scheme;
              // capab.state.instance = this.scheme;
              // if (this.scheme=="hsv"){
              //   capab.state.value = {h:0,s:0,v:0};
              // }else{
              //   capab.state.value = 0;
              // }
            };
            if (temperature_k){
                capab.parameters.temperature_k = {
                    min: temperature_min,
                    max: temperature_max
                };
              // capab.state.instance = 'temperature_k';
              // capab.state.value = this.temperature_min;
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

        node.sendmsg = (state) =>{
            let outmsgs=[null,null,null];
            switch (state.instance) {
                case 'rgb':
                    let value = {
                        r: state.value >> 16,
                        g: state.value >> 8 & 0xFF,
                        b: state.value & 0xFF
                    };
                    outmsgs[0]={ payload: value };
                    break;
                case 'hsv':
                    outmsgs[0]={ payload: state.value };
                    break;
                case 'temperature_k':
                    outmsgs[1]={ payload: state.value };
                    break;
                case 'scene':
                    outmsgs[2]={ payload: state.value };
                    break;
            }
            node.send (outmsgs);
        }

        node.on('input', (msg, send, done)=>{			
			let value = msg.payload;
            let state = {};
            switch (typeof value) {
                case 'object':
                if ((value.r>-1 && value.g>-1 && value.b>-1) || (value.h>-1 && value.s>-1 && value.v>-1)){
                    if (scheme == 'rgb'){
                    value = value.r << 16 | value.g << 8 | value.b;
                    };
                    state.instance = scheme;
                    state.value = value;                    
                }else{
                    node.error("Wrong type! For Color, msg.payload must be RGB or HSV Object.");
                    if (done) {done();}
                    return;
                }
                break;
                case 'number':
                value = Math.round(value);
                if (value>=temperature_min && value<=temperature_max){
                    state.instance = 'temperature_k';
                    state.value = value;                   
                }else{
                    node.error("Wrong type! For Temperature_k, msg.payload must be >=MIN and <=MAX.");
                    if (done) {done();}
                    return;
                }
                break;
                case 'string':
                if (color_scene.includes(value)){
                    state.instance = 'scene';
                    state.value = value;
                }else{
                    node.error("Wrong type! For the Scene, the msg.payload must be set in the settings");
                    if (done) {done();}
                    return;
                }
                break;
                default:
                node.error("Wrong type! Unsupported msg.payload type");
                if (done) {done();}
                return;
            }

            if ( JSON.stringify(currentState.state) === JSON.stringify(state) ){  // Может значение уже установлено?    
                node.debug("Value not changed. Cancel update");
                if (done) {done();}
                return;
            };
			currentState.state = state;
            if (reportable) device.UpdateState(currentState);
            if (retransmit_message === true) {node.sendmsg (currentState.state);}
			node.status({fill:"green",shape:"dot", text:JSON.stringify(msg.payload)});
			if (done) {done();} 
		});

        device.on("Set Action",(capab, devid)=>{     // Обработка команды от облака 
            if (capab.type != ctype){
				return;
			}
            if ( !(capab.state.hasOwnProperty('instance'))) {  // Проверяем наличие instance в команде
				ResponceState.state.action_result.status = "ERROR";
				ResponceState.state.action_result.error_code = "INVALID_ACTION";
				device.ResponceState ( ResponceState, devid );
				return;
			}
            if ( !(capab.state.hasOwnProperty('value'))) {  // Проверяем наличие value в команде
				ResponceState.state.action_result.status = "ERROR";
				ResponceState.state.action_result.error_code = "INVALID_VALUE";
				device.ResponceState ( ResponceState, devid );
				return;
			}
            let value;
            let val = capab.state.value;
            switch (capab.state.instance){
                case 'rgb':
                    if ( val == null || typeof val != 'number'){    // Проверяем входную переменную ( number ли она )
                        ResponceState.state.action_result.status = "ERROR";
                        ResponceState.state.action_result.error_code = "INVALID_VALUE";
                        device.ResponceState ( ResponceState, devid );
                        return;
                    }
                    if ((Number(val) > 16777215)||(Number(val) < 0)) { // Проверяем входную переменную на вхождение в допустимый диапазон  
                        ResponceState.state.action_result.status = "ERROR";
                        ResponceState.state.action_result.error_code = "INVALID_VALUE";
                        device.ResponceState ( ResponceState, devid );
                        return;
                    }
                    ResponceState.state.instance = capab.state.instance;
                    currentState.state = capab.state;
                    node.sendmsg(capab.state);
                    value = {
                        r: Number(currentState.state.value >> 16),
                        g: Number(currentState.state.value >> 8 & 0xFF),
                        b: Number(currentState.state.value & 0xFF)
                    };
                    node.status({fill:"green",shape:"dot", text:JSON.stringify(value)});
                    ResponceState.state.action_result.status = "DONE";
                    device.ResponceState ( ResponceState, devid );
                    break;
                case 'hsv':
                    if ( val == null || typeof val != 'object'){    // Проверяем входную переменную ( object ли она )
                        ResponceState.state.action_result.status = "ERROR";
                        ResponceState.state.action_result.error_code = "INVALID_VALUE";
                        device.ResponceState ( ResponceState, devid );
                        return;
                    }
                    value = {
                        h: Number(val.h),
                        s: Number(val.s),
                        v: Number(val.v)
                    };
                    if ( value.h == null || value.s == null || value.v == null || // Проверяем входную переменную 
                        typeof value.h != 'number' ||typeof value.s != 'number' || typeof value.v != 'number' ){ 
                        ResponceState.state.action_result.status = "ERROR";
                        ResponceState.state.action_result.error_code = "INVALID_VALUE";
                        device.ResponceState ( ResponceState, devid );
                        return;
                    }
                    if ( value.h > 360 || value.s > 100 || value.v > 100 || // Проверяем входную переменную на диапазон значений
                        value.h < 0 || value.s < 0 || value.v < 0 ){ 
                        ResponceState.state.action_result.status = "ERROR";
                        ResponceState.state.action_result.error_code = "INVALID_VALUE";
                        device.ResponceState ( ResponceState, devid );
                        return;
                    }
                    ResponceState.state.instance = capab.state.instance;
                    currentState.state.instance = capab.state.instance;
                    currentState.state.value = value;
                    node.sendmsg(currentState.state);
                    node.status({fill:"green",shape:"dot", text:JSON.stringify(value)});
                    ResponceState.state.action_result.status = "DONE";
                    device.ResponceState ( ResponceState, devid );
                    break;
                case 'temperature_k':
                    if ( val == null || typeof val != 'number'){    // Проверяем входную переменную ( object ли она )
                        ResponceState.state.action_result.status = "ERROR";
                        ResponceState.state.action_result.error_code = "INVALID_VALUE";
                        device.ResponceState ( ResponceState, devid );
                        return;
                    }
                    if ((Number(val) > 9000)||(Number(val) < 2000)) { // Проверяем входную переменную на вхождение в допустимый диапазон  
                        ResponceState.state.action_result.status = "ERROR";
                        ResponceState.state.action_result.error_code = "INVALID_VALUE";
                        device.ResponceState ( ResponceState, devid );
                        return;
                    }
                    ResponceState.state.instance = capab.state.instance;
                    currentState.state = capab.state;
                    value = currentState.state.value;
                    node.send ({ payload: value });
                    node.status({fill:"green",shape:"dot", text:JSON.stringify(value)});
                    ResponceState.state.action_result.status = "DONE";
                    device.ResponceState ( ResponceState, devid );
                    break;
                default: // Функция умения не найдена
                    ResponceState.state.action_result.status = "ERROR";
                    ResponceState.state.action_result.error_code = "INVALID_ACTION";
                    device.ResponceState ( ResponceState, devid );
            }        
        });

        // Статус ноды по умолчанию
		node.status({fill:"red",shape:"dot",text:"offline"});

        node.init();
        // Регистрация умения в устройстве
		const intrvl = setInterval(() => {
			if ( device.GetInitStatus() == true && initState ){
                device.RegistryCapabilitieInfo(capab);
				device.SetStatus(currentState);
				clearInterval(intrvl);
			}	
		}, 50)	

    }
    RED.nodes.registerType("ST-Color",ColorNode);
};