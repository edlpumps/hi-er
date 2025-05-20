const { wrap } = require('lodash');

flat = require('flatjson');
ExcelJS = require('exceljs');


//Exporter helpers
const common_xlsx_headings = {
	"alternative_part_number": "Alternative Part Number",
	"brand": "Brand",
	"certificate_number": "Certificate Number",
	"configuration": "Configuration",
	"control_methods_external-control": "External Input Speed Control",
	"control_methods_external-other-control": "External Input Speed and Other Controls",
	"control_methods_manual-control": "Manual Speed Control",
	"control_methods_no-speed-control": "Full Speed",
	"control_methods_pressure-control": "Pressure Control",
	"control_methods_temperature-control": "Temperature Control ",
	"control_power_input_bep": "BEP Control input power",
	"date": "Date listed",
	"diameter": "Full impeller diameter",
	"doe": "DOE product category",
	"driver_input_power_bep": "BEP Driver input power",
	"energy_rating": "Pump Energy Rating",
	"extended_er": "Extended Product Energy Rating",
	"extended_pei": "Extended Product PEI",
	"flow": "BEP flow rate",
	"flow_bep": "BEP Flow rate",
	"head_100": "BEP head at max speed",
	"head_25": "Load point head at 25% of BEP at max speed ",
	"head_50": "Load point head at 50% of BEP at max speed",
	"head_75": "Load point head at 75% of BEP at max speed",
	"head_bep": "BEP Head",
	"installation_site_address": "Installation Site Address",
	"installation_site_name": "Installation Site",
	"least_control_method": "Most Efficient Control Method",
	"least_energy_rating": "Most Efficient ER",
	"least_input_power_100": "Rated BEP input power",
	"least_input_power_25": "Rated load point driver or control input power at 25% of BEP",
	"least_input_power_50": "Rated load point driver or control input power at 50% of BEP",
	"least_input_power_75": "Rated load point driver or control input power at 75% of BEP",
	"least_input_power_max": "Rated load point weighted average input power at maximum rotating speed",
	"least_input_power_reduced": "Rated load point weighted average input power at maximum rotating speed",
	"least_pei": "Most Efficient CEI",
	"least_pressure_curve": "Rated Pressure Curve",
	"most_control_method": "Least Efficient Control Method",
	"most_energy_rating": "Least Efficient ER",
	"most_input_power_100": "Least Efficient BEP input power",
	"most_input_power_25": "Least Efficient load point driver or control input power at 25% of BEP",
	"most_input_power_50": "Least Efficient load point driver or control input power at 50% of BEP",
	"most_input_power_75": "Least Efficient load point driver or control input power at 75% of BEP",
	"most_input_power_max": "Least Efficient load point weighted average input power at maximum rotating speed",
	"most_input_power_reduced": "Least Efficient load point weighted average input power at maximum rotating speed",
	"most_pei": "Least Efficient CEI",
	"most_pressure_curve": "Least Efficient Pressure Curve",
	"motor_efficiency": "Motor Efficiency",
	"motor_manufacturer": "Motor Manufacturer",
	"motor_model": "Motor Model",
	"motor_power": "Motor Power",
	"motor_power_rated": "Rated motor power",
	"motor_type": "Motor Type",
	"packager_company": "Packaging Company",
	"packager_email": "Packager Email",
	"packager_name": "Packager Name",
	"participant": "Participant",
	"pei": "Pump Energy Index",
	"pump_basic_model": "Basic Model Number",
	"pump_brand": "Brand",
	"pump_doe": "DOE Designation",
	"pump_er": "Basic Model Energy Rating",
	"pump_pei": "Basic Model PEI",
	"pump_rating_id": "Basic Model Rating ID",
	"rating_id": "Rating ID",
	"revision": "Date updated",
	"section": "Section",
	"speed": "Nominal Speed",
	"stages": "Stages",
	"type": "Pump Type",
	"vfd_manufacturer": "VFD Manufactuer",
	"vfd_model": "VFD Model",
	"vfd_power": "VFD Power"
};

exports.all_headings = Object.assign( {}, common_xlsx_headings );

const gAllHeadings={
    'circulators': Object.assign( {}, 
        {
            "basic_model": "Basic Model Number",
            "manufacturer_model": "Manufacturer Model Number",
            "laboratory": "HI Laboratory Number"
        }, common_xlsx_headings ),
    'pumps': Object.assign( {}, 
        {
            "basic_model": "Basic model designation",
            "individual_model": "Manufacturer's model designation",
            "laboratory": "HI Approved laboratory"
        }, common_xlsx_headings ),
    'certificates': common_xlsx_headings
};

exports.pump_full_headers = [
        'rating_id',
        'participant',
        'basic_model',
        'individual_model',
        'motor_type',
        'brand',
        'laboratory',
        'section',
        'configuration',
        'doe',
        'diameter',
        'speed',
        'stages',
        'flow_bep',
        'head_bep',
        'driver_input_power_bep',
        'control_power_input_bep',
        'control_power_input_bep',
        'motor_power_rated',
        'pei',
        'energy_rating',
        'date',
        'revision'
    ]
exports.pump_qpl_headers = [
        'rating_id',
        'basic_model',
        'individual_model',
        'brand',
        'pei',
        'energy_rating',
        'date',
        'revision'
    ]

exports.circulator_full_headers = [
        'rating_id',
        'participant',
        'brand',
        'basic_model',
        'manufacturer_model',
        'alternative_part_number',
        'type',
        'laboratory',
        'control_methods_no-speed-control',
        'control_methods_pressure-control',
        'control_methods_temperature-control',
        'control_methods_external-control',
        'control_methods_external-other-control',
        'control_methods_manual-control',
        'least_control_method',
        'least_input_power_100',
        'least_input_power_max',
        'least_input_power_reduced',
        'most_control_method',
        'most_input_power_100',
        'most_input_power_max',
        'most_input_power_reduced',
        'head_100',
        'flow',
        'least_pei',
        'least_energy_rating',
        'most_pei',
        'most_energy_rating',
        'date',
        'revision'
    ];
exports.circulator_qpl_headers = [
        'rating_id',
        'brand',
        'basic_model',
        'manufacturer_model',
        'alternative_part_number',
        'least_pei',
        'least_energy_rating',
        'most_pei',
        'most_energy_rating',
        'date',
        'revision'
    ];

exports.certificate_headers = [
    'certificate_number',
    'date',
    'pump_rating_id',
    'pump_basic_model',
    'pump_brand',
    'pump_doe',
    'pump_pei',
    'pump_er',
    'packager_name',
    'packager_company',
    'packager_email',
    'installation_site_name',
    'installation_site_address',
    'motor_manufacturer',
    'motor_model',
    'motor_efficiency',
    'motor_power',
    'motor_type',
    'vfd_manufacturer',
    'vfd_model',
    'vfd_power',
    'extended_pei',
    'extended_er'
]

var qpl_disclaimer_bold = "Responsibility for proper pump selection:";
var qpl_disclaimer = " Proper sizing and selection of pumps is vital to achieving the most efficient pumping system, but this QPL does not contain requirements,";
qpl_disclaimer += " analyses, and procedures necesary to ensure safe, appropriate or efficient selection of a pump or associated products.";
qpl_disclaimer += " The use of the HI Energy Rating and related metrics in this QPL should be used by the pump system owner or their designee secondarily to compare";
qpl_disclaimer += " the energy performance of similar and properly selected pumps.";
qpl_disclaimer += " Refer to ANSI/HI 14.3 Rotodynamic Pumps for Design and Application and HI's Pump System Optimization guidebook,";
qpl_disclaimer += " for considerations to efficient system design, pump selection and operation.";

const disclaimer = {
    qpl: qpl_disclaimer,
    full: ""
};

exports.toXLSX = async (rows, opts) => {

    const select_headings = (in_list, in_json) => {
        const new_json = {};
        for (const key of in_list) {
            if (in_json.hasOwnProperty(key)) {
                new_json[key] = in_json[key];
            }
            else {
                console.log("Could not find value for " + key);
            }
        }
        return new_json;
    }

    var sheet = opts.sheetname || "Sheet 1";
    var delimiter = opts.delimiter || ".";
    var pivot = opts.pivot;
    var in_headers = opts.headers;
    var type = opts.type ? opts.type : 'pumps';
    var type_of_data = opts.type_of_data ? opts.type_of_data : 'full';
    var all_headings = gAllHeadings[type];

    const headings = select_headings(in_headers, all_headings);

    const header_sorter = function (a, b) {
        let i = in_headers.indexOf(a.value);
        let j = in_headers.indexOf(b.value);
        return i - j;
    }
    
    const header_filter = function (key) {
        return in_headers.indexOf(key) >= 0;
    }
    
    var input = [];
    if (rows instanceof Array) {
        input = rows;
    } else {
        input.push(rows);
    }

    //build headers
    var headers = []
    var keys = Object.keys(headings);
    for (var i = 0; i < input.length; i++) {

        for (var j = 0; j < keys.length; j++) {
            if (headers.map(function(h) { return h.value }).indexOf(keys[j]) < 0) {
                var heading = {
                    value: keys[j]
                }
                if (headings && headings[keys[j]]) {
                    heading.label = headings[keys[j]];

                } else {
                    heading.label = keys[j];
                }
                headers.push(heading)
            }
        }
    }

    var col_count = headers.length;
    var row_count = 1;
    var data = [];
    if (type_of_data == 'qpl') {
        data.push([disclaimer[type_of_data]]);
        data.push([""]);
    }
    data.push(headers.map(function(h) { return h.label }));

    let errors = [];
    for (var i = 0; i < input.length; i++) {
        var actual_data = []
        var fo = flat(input[i], delimiter, header_filter);
        for (const key in headers) {
            if (!fo.hasOwnProperty(headers[key].value)) {
                //console.log("Could not find value for " + headers[key].value);
                errors.push(type + " ERR - " + input[i]['rating_id']+" "+headers[key].value);
            }
            actual_data.push(fo[headers[key].value]);
        }
        data.push(actual_data);
        row_count++;
    }
    // if (errors.length > 0) {
    //     console.log(errors);
    // }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheet);
    worksheet.properties.defaultColWidth = 20;
    if (pivot) {
        // we have "row_count" arrays, each of "col_count" items.
        // we need to pivot this into "col_count" rows, each with "row_count" columns...
        var pivoted = [];
        for (var i = 0; i < col_count; i++) {
            var row = [];
            for (var j = 0; j < row_count; j++) {
                row.push(data[j][i]);
            }
            pivoted.push(row);
        }
        worksheet.addRows(pivoted);
        //return xlsx.build([{ name: sheet, data: pivoted }]);
    } else {
        worksheet.addRows(data);
        if (type_of_data == 'qpl') {
            worksheet.mergeCells(1, 1, 1, col_count);
            worksheet.getRow(1).height=100;
            worksheet.getCell('A1').value = {
                richText: [
                    { 
                        text: qpl_disclaimer_bold,
                        font: { bold: true },
                    },
                    {
                        text: qpl_disclaimer,
                    }
                ]
            };
            worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        }
        //return xlsx.build([{ name: sheet, data: data}], {sheetOptions});
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}