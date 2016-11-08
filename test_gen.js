var XLSX = require("xlsx");
var fs = require('fs');
var workbook = XLSX.readFile('./tests/calculator-cases.xlsx');



var section3_calculator = function(workbook, row) {
  var worksheet = workbook.Sheets["Section III (Method A.1)"];
  if ( !worksheet["D"+row] ) {
    return undefined;
  }
  var name = "section3-generated-calculator-test-" + row;
  var test = {
      name : name,
      pump: {
            auto:true,
            doe: worksheet["D"+row].v,
            bowl_diameter : worksheet["E"+row].v,
            speed : worksheet["F"+row].v,
            section : "3",
            stages : worksheet["J"+row].v,
            diameter:10,
            flow: {
              bep75: worksheet["N"+row].v,
              bep100: worksheet["K"+row].v,
              bep110: worksheet["Q"+row].v,
            }, 
            head : {
              bep75:worksheet["O"+row].v, 
              bep100:worksheet["L"+row].v,
              bep110:worksheet["R"+row].v,
            },
            pump_input_power :{
              bep75:worksheet["P"+row].v,
              bep100:worksheet["M"+row].v,
              bep110:worksheet["S"+row].v,
              bep120:worksheet["T"+row].v,
            }
      },
      expected : {
          pei : {value: worksheet["BJ"+row].v, "threshold": 0.001},
          energy_rating : {value: worksheet["CG"+row].v, "threshold": 1},
          success :{value:true},
      } 
  }
  return test;
}

var section4_calculator = function(workbook, row) {
  var worksheet = workbook.Sheets["Section IV (Method B.2)"];
  if ( !worksheet["D"+row] ) {
    return undefined;
  }
  var name = "section4-generated-calculator-test-" + row;
  var test = {
      name : name,
      pump: {
            auto:true,
            doe: worksheet["D"+row].v,
            bowl_diameter : worksheet["E"+row].v,
            speed : worksheet["F"+row].v,
            section : "4",
            stages : worksheet["M"+row].v,
            motor_power_rated : worksheet["K"+row].v,
            motor_regulated : worksheet["G"+row].v == "Yes",
            diameter:10,
            flow: {
              bep75: worksheet["Q"+row].v,
              bep100: worksheet["N"+row].v,
              bep110: worksheet["T"+row].v,
            }, 
            head : {
              bep75:worksheet["R"+row].v, 
              bep100:worksheet["O"+row].v,
              bep110:worksheet["U"+row].v,
            },
            driver_input_power :{
              bep75:worksheet["S"+row].v,
              bep100:worksheet["P"+row].v,
              bep110:worksheet["V"+row].v,
            }
      },
      expected : {
          pei : {value: worksheet["BA"+row].v, "threshold": 0.001},
          energy_rating : {value: worksheet["BX"+row].v, "threshold": 1},
          success :{value:true},
      } 
  }
  return test;
}

var section5_calculator = function(workbook, row) {
  var worksheet = workbook.Sheets["Section V (Method B.1)"];
  if ( !worksheet["D"+row] ) {
    return undefined;
  }
  var name = "section5-generated-calculator-test-" + row;
  var test = {
      name : name,
      pump: {
            auto:true,
            doe: worksheet["D"+row].v,
            bowl_diameter : worksheet["E"+row].v,
            speed : worksheet["F"+row].v,
            section : "5",
            stages : worksheet["N"+row].v,
            motor_power_rated : worksheet["L"+row].v,
            motor_regulated : worksheet["G"+row].v == "yes" || worksheet["G"+row].v == "Yes" ,
            motor_efficiency :worksheet["M"+row].v,
            diameter:10,
            flow: {
              bep75: worksheet["R"+row].v,
              bep100: worksheet["O"+row].v,
              bep110: worksheet["U"+row].v,
            }, 
            head : {
              bep75:worksheet["S"+row].v, 
              bep100:worksheet["P"+row].v,
              bep110:worksheet["V"+row].v,
            },
            pump_input_power :{
              bep75:worksheet["T"+row].v,
              bep100:worksheet["Q"+row].v,
              bep110:worksheet["W"+row].v,
            }
      },
      expected : {
          pei : {value: worksheet["BL"+row].v, "threshold": 0.001},
          energy_rating : {value: worksheet["CI"+row].v, "threshold": 1},
          success :{value:true},
      } 
  }
  return test;
}

var section6a_calculator = function(workbook, row) {
  var worksheet = workbook.Sheets["Section VI-a (Method C2)"];
  if ( !worksheet["D"+row] ) {
    return undefined;
  }
  var name = "section6a-generated-calculator-test-" + row;
  var test = {
      name : name,
      pump: {
            auto:true,
            doe: worksheet["D"+row].v,
            bowl_diameter : worksheet["E"+row].v,
            speed : worksheet["F"+row].v,
            section : "6a",
            stages : worksheet["J"+row].v,
            motor_power_rated : worksheet["H"+row].v,
            motor_regulated : worksheet["G"+row].v == "yes" || worksheet["G"+row].v == "Yes" ,
            motor_efficiency :worksheet["I"+row].v,
            diameter:10,
            flow: {
              bep75: worksheet["N"+row].v,
              bep100: worksheet["K"+row].v,
              bep110: worksheet["P"+row].v,
            }, 
            head : {
              bep75:worksheet["O"+row].v, 
              bep100:worksheet["L"+row].v,
              bep110:worksheet["Q"+row].v,
            },
            measured_control_power_input : {
              bep25:10,
              bep50:20, 
              bep75:42,
              bep100:51.4144
            },
            measured_control_flow_input : {
              bep25:92,
              bep50:170, 
              bep75:255,
              bep100:349.8305
            },
            measured_control_head_input : {
              bep25:100,
              bep50:175, 
              bep75:260,
              bep100:424.4298
          },
      },
      expected : {
          pei : {value: worksheet["BT"+row].v, "threshold": 0.001},
          energy_rating : {value: worksheet["CQ"+row].v, "threshold": 1},
          success :{value:true},
      } 
  }
  return test;
}


var section6b_calculator = function(workbook, row) {
  var worksheet = workbook.Sheets["Section VI-b (Method C2)"];
  if ( !worksheet["D"+row] ) {
    return undefined;
  }
  var name = "section6b-generated-calculator-test-" + row;
  var test = {
      name : name,
      pump: {
            auto:true,
            doe: worksheet["D"+row].v,
            bowl_diameter : worksheet["E"+row].v,
            speed : worksheet["F"+row].v,
            section : "6b",
            stages : worksheet["J"+row].v,
            motor_power_rated : worksheet["H"+row].v,
            motor_regulated : worksheet["G"+row].v == "yes" || worksheet["G"+row].v == "Yes" ,
            motor_efficiency :worksheet["I"+row].v,
            diameter:10,
            flow: {
              bep75: worksheet["N"+row].v,
              bep100: worksheet["K"+row].v,
              bep110: worksheet["P"+row].v,
            }, 
            head : {
              bep75:worksheet["O"+row].v, 
              bep100:worksheet["L"+row].v,
              bep110:worksheet["Q"+row].v,
            },
            measured_control_power_input : {
              bep25:10,
              bep50:20, 
              bep75:42,
              bep100:51.4144
            },
            measured_control_flow_input : {
              bep25:92,
              bep50:170, 
              bep75:255,
              bep100:349.8305
            },
            measured_control_head_input : {
              bep25:100,
              bep50:175, 
              bep75:280,
              bep100:424.4298
          },
      },
      expected : {
          pei : {value: worksheet["BT"+row].v, "threshold": 0.001},
          energy_rating : {value: worksheet["CQ"+row].v, "threshold": 1},
          success :{value:true},
      } 
  }
  return test;
}

var save_test = function (test) {
  if (test) {
    fs.writeFileSync("./tests/test_cases/"+test.name+".json", JSON.stringify(test, null, '\t'));
    console.log("Generated test case [" + test.name + "]");
  }
}

var row = 6;
var ok;
do {
  ok = false;

  //// Section 3 Calculator
  var test = section3_calculator(workbook, row);
  if ( test ) ok = true;
  save_test(test);

  //// Section 4 Calculator
  var test = section4_calculator(workbook, row);
  if ( test ) ok = true;
  save_test(test);

  //// Section 5 Calculator
  var test = section5_calculator(workbook, row);
  if ( test ) ok = true;
  save_test(test);

  //// Section 6a Calculator
  var test = section6a_calculator(workbook, row);
  if ( test ) ok = true;
  save_test(test);

  //// Section 6b Calculator
  var test = section6b_calculator(workbook, row);
  if ( test ) ok = true;
  save_test(test);

  row++;
} while (ok);







