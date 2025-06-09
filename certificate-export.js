const schemas = require("./schemas");
const toxl = require('jsonexcel');



const get_listed = async () => {
    const certificates = await schemas.Certificates.find({}).populate('pump').exec();

    return certificates;
}



const fill_data = (listing, row) => {
    if (listing.packager) {
        row.packager_name = listing.packager.name;
        row.packager_company = listing.packager.company;
        row.packager_email = listing.packager.email;
    }
    if (listing.installation_site) {
        row.installation_site_name = listing.installation_site.name;
        if (listing.installation_site.address) {
            row.installation_site_address = `${listing.installation_site.address.street}, ${listing.installation_site.address.city} ${listing.installation_site.address.state} ${listing.installation_site.address.zip} ${listing.installation_site.address.country}`;
        }
    }
    if (listing.pump) {
        row.pump_rating_id = listing.pump.rating_id;
        row.pump_basic_model = listing.pump.basic_model;
        row.pump_brand = listing.pump.brand;
        row.pump_doe = listing.pump.doe;
        row.pump_pei = listing.pump.pei.toFixed(2);
        row.pump_er = listing.pump.energy_rating.toFixed(1);
    }
    if (listing.motor) {
        row.motor_manufacturer = listing.motor.manufacturer;
        row.motor_model = listing.motor.model;
        row.motor_efficiency = listing.motor.efficiency ? listing.motor.efficiency.toFixed(2) : "";
        row.motor_power = listing.motor.power ? listing.motor.power.toFixed(2) : "";
        row.motor_type = listing.motor.motor_type;
    }
    if (listing.vfd) {
        row.vfd_manufacturer = listing.vfd.manufacturer;
        row.vfd_model = listing.vfd.model;
        row.vfd_power = listing.vfd.power;
    }
    if (listing.date) {
        //Convert date to string
        row.date = listing.date.toISOString().split('T')[0];
    }
    row.extended_pei = listing.pei.toFixed(2);
    row.extended_er = listing.energy_rating.toFixed(0);
    row.certificate_number = listing.certificate_number;
}

const prep_for_export = (listings) => {
    const calculator = require('./calculator');
    const rows = [];

    for (var listing of listings) {
        //console.log(`Processing Cert No: ${listing.certificate_number}`);
        //console.log(`Listing details: ${JSON.stringify(listing, null, 2)}`);
        if (listing._doc.test || listing.packager.name == "xx" || !listing.pump || !listing.pump.rating_id || !listing.pump.participant || !listing.pump.basic_model) {
            console.log("Skipping listing "+ listing.certificate_number + " due to test flag, pkg name [xx] or missing required pump data.");
            console.log('    Test Flag: ' + listing._doc.test);
            console.log('    Packager Name: ' + listing.packager.name);
            if (listing.pump)
                console.log('    Rqd info: ' + listing.pump.rating_id + ', ' + listing.pump.participant + ', ' + listing.pump.basic_model);
            else 
                console.log('    Pump is null or undefined');
            continue;
        }
        const row = {}
        fill_data(listing, row);
        let calc_map = {rating_id: row.pump_rating_id, pei: row.extended_pei, energy_rating: row.extended_er, motor_power_rated: row.vfd_power}
        let retval = calculator.calculate_pump_hp_group_and_tier(calc_map);
        if (retval.cee_tier != "None") {
            retval.cee_tier = "Tier " + retval.cee_tier;
        }
        row.hp_group = retval.hp_group;
        row.cee_tier = retval.cee_tier;
        rows.push(row);
    }
    return rows;
}

exports.getCertificates = get_listed;
exports.getExportable = prep_for_export;