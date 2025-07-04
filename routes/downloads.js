"use strict";

const express = require('express');
const router = express.Router();

const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 60 * 60 * 24, checkperiod: 600 });  // one day ttl, check every 10 minutes
const exporter = require('../exporter');
const circulatorExport = require("../circulator-export");
const lcc = require("../lcc");
const { model } = require('mongoose');

router.get("/", async (req, res) => {
    if (req.user && req.user.admin) {
        const data = {
            routes: router.stack
                .filter(r => r.route)
                .filter(r => r.path !== "/")
                .map(r => `${req.baseUrl}${r.route.path}`),
            user: req.user
        }

        res.render("downloads", data);
    }
    else {
        res.redirect("/");
    }
});

router.get("/lcc.csv", async (req, res) => {
    if (!(req.user && req.user.admin)) {
        res.redirect("/");
        return;
    }
    let csv = cache.get("lcc")
    if (!csv) {
        console.log("LCC request rebuild")
        csv = await lcc.generate();
        cache.set("lcc", csv);
    } else {
        console.log("LCC cached");
    }

    res.header('Content-Type', 'text/csv');
    return res.send(csv);
})

router.get("/circulator-ratings/summary.csv", async (req, res) => {
    if (!(req.user && req.user.admin)) {
        res.redirect("/");
        return;
    }
    const csv = await circulatorExport.getCirculatorDatabaseSummaryCsv();

    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", "attachment; filename=circulator-ratings-summary.csv")
    res.send(csv);
});

// router.get("/circulator-ratings/summary-details.csv", async (req, res) => {
//     const csv = await circulatorExport.getCirculatorDatabaseSummaryCsv(true);

//     res.header("Content-Type", "text/csv");
//     res.header("Content-Disposition", "attachment; filename=circulator-ratings-summary-details.csv")
//     res.send(csv);
// });

router.get("/ci_energy_ratings-qpl.xlsx", async (req, res) => {
    if (!(req.user && req.user.admin)) {
        res.redirect("/");
        return;
    }
    const pumps = await exporter.create("pumps");
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.header("Content-Disposition", "attachment; filename=ci_energy_ratings-qpl.xlsx");
    return res.send(pumps.pumps.qpl);
});
router.get("/ci_energy_ratings-full.xlsx", async (req, res) => {
    if (!(req.user && req.user.admin)) {
        res.redirect("/");
        return;
    }
    const pumps = await exporter.create("pumps");
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.header("Content-Disposition", "attachment; filename=ci_energy_ratings-full.xlsx");
    return res.send(pumps.pumps.full);
});
router.get("/circulator_energy_ratings-qpl.xlsx", async (req, res) => {
    if (!(req.user && req.user.admin)) {
        res.redirect("/");
        return;
    }
    const circulators = await exporter.create("circulators");
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.header("Content-Disposition", "attachment; filename=circulator_energy_ratings-qpl.xlsx");
    return res.send(circulators.circulators.qpl);
});
router.get("/circulator_energy_ratings-full.xlsx", async (req, res) => {
    if (!(req.user && req.user.admin)) {
        res.redirect("/");
        return;
    }
    const circulators = await exporter.create("circulators");
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.header("Content-Disposition", "attachment; filename=circulator_energy_ratings-full.xlsx");
    return res.send(circulators.circulators.full);
});
router.get("/extended_product_certificates-qpl.xlsx", async (req, res) => {
    if (!(req.user && req.user.admin)) {
        res.redirect("/");
        return;
    }
    const certificates = await exporter.create("certificates", req.user);
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.header("Content-Disposition", "attachment; filename=extended_product_certificates-qpl.xlsx");
    return res.send(certificates.certificates.qpl);
});
router.get("/extended_product_certificates-full.xlsx", async (req, res) => {
    if (!(req.user && req.user.admin)) {
        res.redirect("/");
        return;
    }
    const certificates = await exporter.create("certificates", req.user);
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.header("Content-Disposition", "attachment; filename=extended_product_certificates-full.xlsx");
    return res.send(certificates.certificates.full);
});

module.exports = router;
