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
    test.result = calculator.manual(test.pump);
  })

  tests.forEach(function(test) {
    describe(test.name + ' - full calculation testing', function() {
      it("calculates outcome matches (success or fail)", function() {
        assert(test.result.success === test.expected.success.value, "calculation failed with reason " + JSON.stringify(test.result.reasons));
      })
      for (var value in test.expected) {
        let value_to_test = value;
        it(value_to_test + " - value matches", function() {
          var target = test.expected[value_to_test];
          if (typeof target.value == "number") {
            expect(test.result[value_to_test]).to.be.closeTo( target.value, target.threshold, " Value of " + value_to_test + " is " + test.result[value_to_test]);
          }
          else {
            assert(test.result[value_to_test] == target.value, " Value of " + value_to_test + " is " + test.result[value_to_test]);
          }
        });
      }
    });
  });
}


  
  


  