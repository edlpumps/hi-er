"use strict";

const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const pug = require('pug');
const qr = require('qr-image');
const Datauri = require('datauri');
const datauri = new Datauri();
const circulator = require('../controllers/circulator');

const hi_logo_data_uri = fs.readFileSync(path.join(__dirname, "../views/svg/hi-title"), "utf-8");
const hi_logo_data_uri_small = fs.readFileSync(path.join(__dirname, "../views/svg/hi-title-small"), "utf-8");
const qr_template_file = path.join(__dirname, "../views/svg/qr.pug");
const qr_template = pug.compileFile(qr_template_file);
const label_template_file = path.join(__dirname, "../views/svg/label.pug");
const label_sm_template_file = path.join(__dirname, "../views/svg/label-sm.pug");
const label_template = pug.compileFile(label_template_file);
const label_sm_template = pug.compileFile(label_sm_template_file);



const circulator_label_template_file = path.join(__dirname, "../views/svg/circulator-label.pug");
const circulator_small_label_template_file = path.join(__dirname, "../views/svg/circulator-label-small.pug");



var build_label_params = function (pump, label) {
    var pm = pump.configuration == "bare" ? "- Bare Pump" : "- Motor";
    var config =
        pump.configuration == "bare" || pump.configuration == "pump_motor" ?
        "" :
        (pump.configuration == "pump_motor_cc" ?
            "- Continuous Controls" :
            "- Non-Continuous Controls");

    var load = pump.configuration == "bare" || pump.configuration == "pump_motor" ? "CONSTANT LOAD" : "VARIABLE LOAD";
    var load_abbr = pump.configuration == "bare" || pump.configuration == "pump_motor" ? "CL" : "VL";
    var datetime = label.date.getTime() < pump.date.getTime() ? pump.date : label.date;
    var locale = "en-us";

    var er = Math.min(pump.energy_rating, label.max);
    var date = datetime.toLocaleString(locale, {
        month: "short"
    });
    var span = label.max - label.min;
    var distance = (er - label.min) / span;
    var pos = Math.round(distance * 500 + 60);
    date += " " + datetime.getFullYear()

    return {
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
        logo: hi_logo_data_uri,
        load_abbr: load_abbr
    };


}

exports.make_qr = function (req, participant, pump, label) {
    const port = req.app.settings.port || cfg.port;
    const base = req.protocol + '://' + req.host;
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
    return label_template(params);
}

exports.make_sm_label = function (req, participant, pump, label) {
    var params = build_label_params(pump, label);
    return label_sm_template(params);
}


var build_circulator_params = function (pump, waip, max) {
    var datetime = pump.date
    var locale = "en-us";

    var er = Math.min(pump.energy_rating, max);
    var date = datetime.toLocaleString(locale, {
        month: "short"
    });
    var distance = (er) / max;
    var pos = Math.round(distance * 500 + 60);
    date += " " + datetime.getFullYear()

    const methods = [];
    for (const cm of circulator.control_methods) {
        if (pump.control_methods.indexOf(cm.label) >= 0) {
            let c = cm.display;
            if (pump.least.control_method == cm.label) {
                c += " (Rated)";
            }
            methods.push(c);
        }
    }
    return {
        methods: methods,
        dual: pump.most && pump.most.control_method,
        er_most: pump.most && pump.most.control_method ? pump.most.energy_rating.toFixed(0) : 0,
        max: max,
        pei: pump.least.pei.toFixed(2),
        basic_model: pump.basic_model,
        brand: pump.brand,
        er: pump.least.energy_rating.toFixed(0),
        date: date,
        rating_id: pump.rating_id,
        bar_width: distance * 500 - 1,
        er_pos: pos,
        logo: hi_logo_data_uri,
        small_logo: hi_logo_data_uri_small,
        waip: waip.toFixed(3)
    };


}

const calc_circ_vals = function (pump) {
    const waip = pump.least.waip;

    let hp = 0;
    if (waip < 1.0 / 30) hp = 0;
    else if (waip < 1.0 / 8) hp = 1;
    else if (waip < 3.0 / 4) hp = 2;
    else hp = 3;
    const scales = [335.4, 189.6, 158.6, 142.3];
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