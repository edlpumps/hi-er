const schemas = require("./schemas");
const toxl = require('jsonexcel');



const get_listed = async () => {
    const certificates = await schemas.Certificates.find({}).populate('pump').exec();

    return certificates;
}



const fill_data = (listing, row) => {
    const calculator = require('./calculator');
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
    
    let retval = calculator.calculate_certificate_hp_group_and_tier(listing);
    if (retval.cee_tier != "None") {
        retval.cee_tier = "Tier " + retval.cee_tier;
    }
    row.hp_group = retval.hp_group;
    row.cee_tier = retval.cee_tier;
}

const prep_for_export = (listings, user) => {
    const rows = [];
    let filtered = exports.filterCertificates(listings, user);
    for (var listing of filtered) {
        //console.log(`Processing Cert No: ${listing.certificate_number}`);
        //console.log(`Listing details: ${JSON.stringify(listing, null, 2)}`);
        const row = {}
        fill_data(listing, row);
        rows.push(row);
    }
    return rows;
}

function invalid_field(id, field_str, value) {
    if (!value || value == "xx" || value == "test" || value == "n/a" || value == "none") {
        console.log(`Certificate ${id} has invalid ${field_str}: ${value}`);
        return id;
    }
    return null;
}

const filter_certificates = (certificates, user) => {
    let filtered = certificates;
    if (!certificates || !certificates.length) return filtered;
    let is_user_admin = false;
    if (user && user.admin) {
        is_user_admin = true;
    }
    let new_filtered = [];
    let filter_count = {}; 
    let filtered_list = [];
    let invalid = null;
    // Check the _id only if it is a string (this is used on the cert search page to retrieve the participants)
    new_filtered = filtered.filter(p => {
        if ("_id" in p && typeof(p._id) === 'string') {
            let id = p._id.toLowerCase();
            return !invalid_field(p._id, "packager", id);
        }
        else return true;
    });
    filter_count['identifier'] = filtered.length - new_filtered.length;
    if (!is_user_admin) filtered = new_filtered;
    // Check "packager" fields Make sure packager name and company
    new_filtered = filtered.filter(p => {
        if ("packager" in p && p.packager) {
            let name = p.packager.name.toLowerCase();
            invalid = invalid_field(p.certificate_number, "packager_name", name);
            if (!invalid) {
                let company  = p.packager.company.toLowerCase();
                invalid = invalid_field(p.certificate_number, "company", company);
            } 
            if (invalid)
                filtered_list.push(invalid);
            return !invalid;
        }
        else return true;
    });
    filter_count['packager_company'] = filtered.length - new_filtered.length;
    if (!is_user_admin) filtered = new_filtered;
    // Check "vfd" fields.  Make sure there is a basic model
    new_filtered = filtered.filter(p => {
        let model="";
        let validate_field = "";
        //console.log(`${p.vfd.model} ${p.motor.model}`);
        if (p.vfd && p.vfd.model) {
            model = p.vfd.model.toLowerCase();
            validate_field = "vfd_model";
        }
        else if (p.motor && p.motor.model) {
            model  = p.motor.model.toLowerCase();
            validate_field = "motor_model";
        }
        else {
            console.log(`Certificate ${p.certificate_number} has no motor or vfd model`);
            filtered_list.push(p.certificate_number);
            return false;
        }
        invalid = invalid_field(p.certificate_number, validate_field, model);
        if (invalid) filtered_list.push(invalid);
        return !invalid;
    });

    filter_count['vfd_model'] = filtered.length - new_filtered.length;
    if (!is_user_admin) filtered = new_filtered;
    // Check the "pump" fields
    new_filtered = filtered.filter(p => {
        if ("pump" in p) 
            if (!p.pump || !p.pump.rating_id || !p.pump.participant || !p.pump.basic_model) {
                console.log(`Certificate ${p.certificate_number} has invalid pump data`);
                filtered_list.push(p.certificate_number);
                return false;
            }
        return true;
    });
    filter_count['pump'] = filtered.length - new_filtered.length;
    if (!is_user_admin) filtered = new_filtered;
    if (filtered.length != certificates.length) {
        console.log("Filtered out " + (certificates.length - filtered.length) + " certificates");
    }
    return filtered;
}

exports.getCertificates = get_listed;
exports.getExportable = prep_for_export;
exports.filterCertificates = filter_certificates;