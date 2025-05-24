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
    const rows = [];

    for (const listing of listings) {
        const row = {}
        fill_data(listing, row);
        rows.push(row);
    }
    return rows;
}

exports.getCertificates = get_listed;
exports.getExportable = prep_for_export;