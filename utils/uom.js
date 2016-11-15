

exports.US = "US";
exports.METRIC = "METRIC";

exports.factors = {
    flow : 0.227124707, 
    head : 0.3048,
    power : 0.745699872,
    diameter :  25.4
}

var factors = exports.factors;

exports.convert_to_us = function(pump) {
      if ( pump.unit_set == "US") return pump;

      var retval = JSON.parse(JSON.stringify(pump));
      
      retval.diameter /= factors.diameter;
      
      retval.bowl_diameter /= factors.diameter;
      retval.bowl_diameter = Math.round(retval.bowl_diameter);
      
      retval.motor_power_rated  /= factors.power;
      retval.motor_power_rated = Math.round(retval.motor_power_rated); 
      
      retval.flow.bep75 /= factors.flow;
      retval.flow.bep100 /= factors.flow;
      retval.flow.bep110 /= factors.flow;
      retval.head.bep75 /= factors.head;
      retval.head.bep100 /= factors.head;
      retval.head.bep110 /= factors.head;

      if (retval.pump_input_power) {
          retval.pump_input_power.bep75 /= factors.power;
          retval.pump_input_power.bep100 /= factors.power;
          retval.pump_input_power.bep110 /= factors.power;
          if ( retval.pump_input_power.bep120 ) retval.pump_input_power.bep120 /= factors.power;
      }
      if (retval.driver_input_power) {
          retval.driver_input_power.bep75 /= factors.power;
          retval.driver_input_power.bep100 /= factors.power;
          retval.driver_input_power.bep110 /= factors.power;
      }
      if (retval.control_power_input) {
          retval.control_power_input.bep25 /= factors.power;
          retval.control_power_input.bep50 /= factors.power;
          retval.control_power_input.bep75 /= factors.power;
          retval.control_power_input.bep100 /= factors.power;
      }
      if (retval.measured_control_power_input) {
          retval.measured_control_power_input.bep25 /= factors.power;
          retval.measured_control_power_input.bep50 /= factors.power;
          retval.measured_control_power_input.bep75 /= factors.power;
          retval.measured_control_power_input.bep100 /= factors.power;
      }
      if (retval.measured_control_flow_input) {
          retval.measured_control_flow_input.bep25 /= factors.flow;
          retval.measured_control_flow_input.bep50 /= factors.flow;
          retval.measured_control_flow_input.bep75 /= factors.flow;
          retval.measured_control_flow_input.bep100 /= factors.flow;
      }
      if (retval.measured_control_head_input) {
          retval.measured_control_head_input.bep25 /= factors.head;
          retval.measured_control_head_input.bep50 /= factors.head;
          retval.measured_control_head_input.bep75 /= factors.head;
          retval.measured_control_head_input.bep100 /= factors.head;
      }
      return retval;
  
}