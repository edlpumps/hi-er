"use strict";

var assert = require("chai").assert;
var expect = require("chai").expect;
var calculator = require('../calculator');
var fs = require('fs');
var path = require('path');


/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Fully automated tests
//-------------------------------------------------------------------------------------------------------
//   Each file in the "test_cases" directory should contain a json which specifies the name of the test,
//   the pump (input), and all the expected results.  
//   
//   This test suite will ensure each field in the expected results is matched by the calculator output.
/////////////////////////////////////////////////////////////////////////////////////////////////////////   


var tests = [];
var dir = path.join(__dirname, "test_cases");
fs.readdir(dir, function(err, items) {
  for (var i=0; i<items.length; i++) {
    tests.push(require(path.join(dir, items[i])));
  }
  test_runner(tests);
});

    

var test_runner = function(tests) {
  tests.forEach(function(test) {
    test.result = calculator.manual.section3(test.pump);
  })

  tests.forEach(function(test) {
    describe(test.name + ' - full calculation testing', function() {
      for (var value in test.expected) {
        it(value, function() {
          var target = test.expected[value];
          expect(test.result[value]).to.be.closeTo( target.value, target.threshold, " Value of " + value + " is " + test.result[value]);
        });
      }
    });
  });
}


  
  


  