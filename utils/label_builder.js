"use strict";

const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const pug = require('pug');
const common = require('../routes/common');
const qr = require('qr-image');
const Datauri = require('datauri');
const datauri = new Datauri();
const circulator = require('../controllers/circulator');
const { Resvg } = require('@resvg/resvg-js');
//Include i18next for translations
const i18next = require('i18next');
const lang = require('../utils/language');

const svg_opts = {
    font: {
        fontFiles: [path.join(__dirname, '../utils/fonts/Arimo-Regular.ttf'), 
            path.join(__dirname, '../utils/fonts/Arimo-Bold.ttf'), 
        ], // font files to use
        defaultFontFamily: 'Arimo' // font to use for SVG to PNG conversion
    }
}

const hi_logo_data_uri_en = fs.readFileSync(path.join(__dirname, "../views/svg/"+i18next.t("hi_label_logo", {lng:'en'})), "utf-8");
const hi_logo_data_uri_small_en = fs.readFileSync(path.join(__dirname, "../views/svg/"+i18next.t("hi_label_logo_small", {lng:'en'})), "utf-8");
const hi_logo_data_uri_fr = fs.readFileSync(path.join(__dirname, "../views/svg/"+i18next.t("hi_label_logo", {lng:'fr'})), "utf-8");
const hi_logo_data_uri_small_fr = fs.readFileSync(path.join(__dirname, "../views/svg/"+i18next.t("hi_label_logo_small", {lng:'fr'})), "utf-8");
const hi_approval_check_uri = fs.readFileSync(path.join(__dirname, "../views/svg/hi-approval-check"), "utf-8");
const qr_template_file = path.join(__dirname, "../views/svg/qr.pug");
const qr_template = pug.compileFile(qr_template_file);
const label_template_file = path.join(__dirname, "../views/svg/label.pug");
const label_sm_template_file = path.join(__dirname, "../views/svg/label-sm.pug");
const label_template = pug.compileFile(label_template_file);
const label_sm_template = pug.compileFile(label_sm_template_file);



const circulator_label_template_file = path.join(__dirname, "../views/svg/circulator-label.pug");
const circulator_small_label_template_file = path.join(__dirname, "../views/svg/circulator-label-small.pug");

exports.svg_to_png = function (svg) {
    return new Resvg(svg,svg_opts).render().asPng();
}

var build_label_params = function (pump, label) {
    var label_lang = lang.get_label_language();
    var pm = pump.configuration == "bare" ? "- "+i18next.t('bare_pump',{lng:label_lang}) : "- "+i18next.t('motor',{lng:label_lang});
    var config =
        pump.configuration == "bare" || pump.configuration == "pump_motor" ?
            "" :
            (pump.configuration == "pump_motor_cc" ?
                "- "+i18next.t('continuous_controls',{lng:label_lang}) :
                "- "+i18next.t('non_continuous_controls',{lng:label_lang}));

    var load = pump.configuration == "bare" || pump.configuration == "pump_motor" ? i18next.t('constant_load',{lng:label_lang}) : i18next.t('variable_load',{lng:label_lang});
    load = load.toUpperCase();
    var load_abbr = pump.configuration == "bare" || pump.configuration == "pump_motor" ? i18next.t('cl',{lng:label_lang}) : i18next.t('vl',{lng:label_lang});
    var datetime = label.date.getTime() < pump.date.getTime() ? pump.date : label.date;
    var er = Math.min(pump.energy_rating, label.max);
    var date = datetime.toLocaleString(label_lang, {
        month: "short"
    });
    var span = label.max - label.min;
    var distance = (er - label.min) / span;
    var pos = Math.round(distance * 500 + 60);
    date += " " + datetime.getFullYear()
    var annual_cost_savings = common.calculate_cost_savings(pump.energy_rating, pump.motor_power_rated);
    var annual_energy_savings = common.calculate_energy_savings(pump.energy_rating, pump.motor_power_rated);
    var loc_dict = {
        lang: label_lang,
        pump_type: i18next.t('pump_type',{lng:label_lang}), 
        model: i18next.t('model',{lng:label_lang}),
        nominal_speed: i18next.t('nominal_speed',{lng:label_lang}),
        pei: i18next.t('pei',{lng:label_lang}),
        energy_rating: i18next.t('energy_rating',{lng:label_lang}).toUpperCase(),
        least_efficient: i18next.t('least_efficient',{lng:label_lang}),
        most_efficient: i18next.t('most_efficient',{lng:label_lang}),
        range: i18next.t('range',{lng:label_lang}).toUpperCase(),
        kwh: i18next.t('kwh',{lng:label_lang}),
        annual_energy_savings: i18next.t('annual_energy_savings',{lng:label_lang}),
        label_annual_savings: i18next.t('label_ci_annual_savings',{lng:label_lang}),
        annual_cost_savings: i18next.t('annual_cost_savings',{lng:label_lang})
        };
    let retval= {
        loc: loc_dict,
        pei: pump.pei.toFixed(2),
        doe: pump.doe,
        pm: pm,
        config: config,
        participant: pump.participant,
        basic_model: pump.basic_model,
        brand: pump.brand,
        speed: pump.speed,
        load: load,
        er: pump.energy_rating,
        date: date,
        rating_id: pump.rating_id,
        bar_width: distance * 500 - 1,
        er_pos: pos,
        motor_power: pump.motor_power_rated,
        logo: label_lang == 'en'? hi_logo_data_uri_en: hi_logo_data_uri_fr,
        load_abbr: load_abbr,
        annual_cost_savings: annual_cost_savings,
        annual_energy_savings: annual_energy_savings,
        annual_run_hours: 4000,
        cost_per_kwh: (0.15 * 100).toFixed(2)
    };
    //console.log(JSON.stringify(retval, null, 2));
    return retval;

}

exports.make_qr = function (req, participant, pump, label) {
    const port = req.app.settings.port || cfg.port;
    const base = req.protocol + '://' + req.hostname;
    const url = base + "/ratings/" + pump.rating_id;
    const code = qr.imageSync(url, {
        type: 'png'
    });

    datauri.format('.png', code);
    var qr_params = build_label_params(pump, label);
    qr_params.qr = datauri.content
    return qr_template(qr_params);
}

exports.make_label = function (req, participant, pump, label) {
    var params = build_label_params(pump, label);
    var output = label_template(params);
    return output;
}

exports.make_sm_label = function (req, participant, pump, label) {
    var params = build_label_params(pump, label);
    var output = label_sm_template(params);
    //console.log(output);
    return output; 
}


var build_circulator_params = function (pump, waip, max) {
    // pump.least is most efficient, pump.most is least efficient
    var label_lang = lang.get_label_language();
    var datetime = pump.date

    var er = Math.min(pump.least.energy_rating, max);
    var date = datetime.toLocaleString(label_lang, {
        month: "short"
    });
    var distance = (er) / max;
    var pos = Math.round(distance * 500 + 60);
    date += " " + datetime.getFullYear()
    // Find the maximum end of the energy rating scale
    max = Math.max(max, pump.least.energy_rating.toFixed(0))
    var is_dual = (pump.most && pump.most.control_method ? true: false);

    //calculate Cost & Energy savings
    var annual_cost_savings = 0;
    var annual_energy_savings = 0;
    try {
        annual_cost_savings = common.calculate_circulator_cost_savings(pump.least.energy_rating.toFixed(), waip.toFixed(3));
        console.log("Cost Savings " + JSON.stringify(annual_cost_savings, null, 2));
        annual_energy_savings = common.calculate_circulator_energy_savings(pump.least.energy_rating.toFixed(), waip.toFixed(3));
        console.log("Energy Savings " + JSON.stringify(annual_energy_savings, null, 2));
    }
    catch (e) {
        console.log("Error in calculating cost and energy savings " + e);
        is_dual = false;
    }

    const methods = [];
    for (const cm of circulator.control_methods) {
        if (pump.control_methods.indexOf(cm.label) >= 0) {
            let c = cm.display;
            c = i18next.t(cm.loc_key,{lng:label_lang});
            if (pump.least.control_method == cm.label) {
                c += ' ('+i18next.t('rated',{lng:label_lang})+')';
            }
            if (cm.display !== "External Input Signal and Other Controls")
                methods.push(c);
        }
    }

    var loc_dict = {
        lang: label_lang, 
        model: i18next.t('model',{lng:label_lang}),
        waip: i18next.t('waip',{lng:label_lang}),
        circulator_pump: i18next.t('circulator_pump',{lng:label_lang}),
        cei: i18next.t('cei',{lng:label_lang}),
        er: i18next.t('er',{lng:label_lang}),
        energy_rating: i18next.t('energy_rating',{lng:label_lang}).toUpperCase(),
        least_efficient: i18next.t('least_efficient',{lng:label_lang}),
        most_efficient: i18next.t('most_efficient',{lng:label_lang}),
        nominal_speed: i18next.t('nominal_speed',{lng:label_lang}),
        pei: i18next.t('pei',{lng:label_lang}),
        range: i18next.t('range',{lng:label_lang}).toUpperCase(),
        label_annual_savings: i18next.t('label_er_savings',{lng:label_lang}),
        annual_energy_savings: i18next.t('annual_energy_savings',{lng:label_lang}),
        annual_cost_savings: i18next.t('annual_cost_savings',{lng:label_lang}),
        kwh: i18next.t('kwh',{lng:label_lang}),
        label_er_methods: i18next.t('label_er_methods',{lng:label_lang}),
        label_circ_annual_savings: i18next.t('label_circ_annual_savings',{lng:label_lang}),
        label_meets_doe_reg: i18next.t('label_meets_doe_reg',{lng:label_lang})
    };

    let retval= {
        loc: loc_dict,
        methods: methods,
        dual: is_dual,
        er_most: is_dual ? pump.most.energy_rating.toFixed(0) : 0,
        max: max,
        pei: pump.least.pei.toFixed(2),
        basic_model: pump.basic_model,
        brand: pump.brand,
        er: pump.least.energy_rating.toFixed(0),
        date: date,
        rating_id: pump.rating_id,
        bar_width: distance * 500 - 1,
        er_pos: pos,
        motor_power: 3,
        logo: label_lang == 'en'? hi_logo_data_uri_en: hi_logo_data_uri_fr,
        small_logo: label_lang == 'en'? hi_logo_data_uri_small_en: hi_logo_data_uri_small_fr,
        waip: waip !== undefined ? waip.toFixed(3) : '',
        approval_check_logo: hi_approval_check_uri,
        annual_cost_savings: annual_cost_savings,
        annual_energy_savings: annual_energy_savings,
        annual_run_hours: 2500,
        cost_per_kwh: (0.15 * 100).toFixed(0),
        reg_year: 2028,
        meets_approval: parseFloat(pump.least.pei.toFixed(2)) <= 1.0 ? true: false
    };
    
    //if (retval.er_most == retval.er) {
    //    delete retval.er_most;
    //}
    //console.log(JSON.stringify(retval, null, 2));
    return retval;
}
const average = (values) => {
    let sum = 0;
    let count = 0;
    for (const v of values) {
        sum += v;
        count++;
    }
    return sum / count;
}
const calc_circ_vals = function (pump) {
    const waip = pump.least.waip;

    const nominal_hp = pump.least.output_power[3] / (pump.least.water_to_wire_efficiency / 100);

    let hp = 0;
    if (nominal_hp < 1.0 / 30) hp = 0;
    else if (nominal_hp < 1.0 / 8) hp = 1;
    else if (nominal_hp < 3.0 / 4) hp = 2;
    else hp = 3;

    const scales = [200, 190, 165, 145];
    const maxScale = scales[hp];
    return {
        waip,
        maxScale
    }
}
exports.make_circulator_label = function (req, participant, pump) {
    const circulator_label_template = pug.compileFile(circulator_label_template_file);
    const {
        waip,
        maxScale
    } = calc_circ_vals(pump);
    return circulator_label_template(build_circulator_params(pump, waip, maxScale));
}
exports.make_circulator_label_small = function (req, participant, pump) {
    const circulator_label_template = pug.compileFile(circulator_small_label_template_file);
    const {
        waip,
        maxScale
    } = calc_circ_vals(pump);
    return circulator_label_template(build_circulator_params(pump, waip, maxScale));
}
exports.make_circulator_qr = function (req, participant, pump) {
    const port = req.app.settings.port || cfg.port;
    const base = req.protocol + '://' + req.host;
    const url = base + "/circulator/ratings/" + pump.rating_id;
    const code = qr.imageSync(url, {
        type: 'png'
    });

    datauri.format('.png', code);
    const {
        waip,
        maxScale
    } = calc_circ_vals(pump);
    var qr_params = build_circulator_params(pump, waip, maxScale);
    qr_params.qr = datauri.content
    return qr_template(qr_params);
}