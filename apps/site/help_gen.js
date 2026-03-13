var XLSX = require("xlsx");
var fs = require('fs');
var workbook = XLSX.readFile('./help.xlsx');

var worksheet = workbook.Sheets["Import-Export Sheet"];

var max_column = 52;

var key_row = 5;
var title_row = 3;
var portal_row = 1;
var calc_row = 2;

var help = {};

split = function(text) {
    if ( !text) return undefined;
    var t = text.split("\r\n");
    return t;
}

for ( var column = 0; column < max_column; column++ ) {
    var col = XLSX.utils.encode_col(column);
    var cell = worksheet[col + key_row]
    if ( cell ) {
        var key = cell.v;
        if ( key ) {
            cell = worksheet[col+title_row];
            var title = cell.v;
            cell = worksheet[col+portal_row];
            var portal_help = cell ? cell.v : undefined;
            cell = worksheet[col+calc_row];
            var calc_help = cell ? cell.v : undefined;

            help[key] = {
                title : title,
                portal_help : split(portal_help),
                calc_help : split(calc_help)
            }
        }
    }
}

fs.writeFileSync("./public/resources/help.json", JSON.stringify(help, null, '\t'));
