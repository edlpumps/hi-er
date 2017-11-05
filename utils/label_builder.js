"use strict";

const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const pug = require('pug');
const qr = require('qr-image');
const Datauri = require('datauri');
const datauri = new Datauri();

const hi_logo_data_uri = fs.readFileSync(path.join(__dirname, "../views/svg/hi-title"), "utf-8");
const qr_template_file = path.join(__dirname, "../views/svg/qr.pug");
const qr_template = pug.compileFile(qr_template_file);
const label_template_file = path.join(__dirname, "../views/svg/label.pug");
const label_template = pug.compileFile(label_template_file);


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