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

const prep_for_export = (listings, user) => {
    const calculator = require('./calculator');
    const rows = [];
    let filtered = filter_certificates(listings, user);
    for (var listing of filtered) {
        //console.log(`Processing Cert No: ${listing.certificate_number}`);
        //console.log(`Listing details: ${JSON.stringify(listing, null, 2)}`);
        const row = {}
        fill_data(listing, row);
        let retval = calculator.calculate_certificate_hp_group_and_tier(row);
        if (retval.cee_tier != "None") {
            retval.cee_tier = "Tier " + retval.cee_tier;
        }
        row.hp_group = retval.hp_group;
        row.cee_tier = retval.cee_tier;
        rows.push(row);
    }
    return rows;
}

const filter_certificates = (certificates, user) => {
    let filtered = certificates;
    if (!certificates || !certificates.length) return filtered;
    if (user && user.admin) {
        return filtered;
    }
    // Check "packager" fields Make sure packager name and company
    console.log(`Filtering ${certificates.length} certificates for export`);
    filtered = filtered.filter(p => {
        if ("packager" in p && p.packager) {
            let name = p.packager.name.toLowerCase();
            if (name != "xx" && name != "test" && name != "n/a" && name != "none" && name != "") {
                let company  = p.packager.company.toLowerCase();
                return (company != "xx" && company != "test" && company != "n/a" && company != "none" && company != "");
            } 
            else return false;
        }
        else return true;
    });
    console.log(`Filtered to ${filtered.length} certificates after packager check`);
    // Check "vfd" fields.  Make sure there is a basic model
    filtered = filtered.filter(p => {
        if ("vfd" in p && p.vfd) {
            let model  = p.vfd.model.toLowerCase();
            return (model != "xx" && model != "test" && model != "n/a" && model != "none" && model != "");
        }
        else return true;
    });
    console.log(`Filtered to ${filtered.length} certificates after VFD check`);
    // Check the _id only if it is a string (this is used on the cert search page to retrieve the participants)
    filtered = filtered.filter(p => {
        if ("_id" in p && typeof(p._id) === 'string') {
            let id = p._id.toLowerCase();
            return (id && id != "xx" && id != "test" && id != "n/a" && id != "none");
        }
        else return true;
    });
    console.log(`Filtered to ${filtered.length} certificates after ID check`);
    // Check the "pump" fields
    filtered = filtered.filter(p => {
        if ("pump" in p) 
            return (p.pump && p.pump.rating_id && p.pump.participant && p.pump.basic_model);
        else return true;
    });
    return filtered;
}

exports.getCertificates = get_listed;
exports.getExportable = prep_for_export;
exports.filterCertificates = filter_certificates;