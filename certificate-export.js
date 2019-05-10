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
        row.pump_pei = listing.pei.toFixed(2);
        row.pump_er = listing.energy_rating.toFixed(1);
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
    row.extended_pei = listing.pei.toFixed(2);
    row.extended_er = listing.energy_rating.toFixed(0);
    row.date = listing.date;
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

const toXLXS = (rows) => {
    const headers = [
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
    ];

    let sorter = function (a, b) {
        let i = headers.indexOf(a.value);
        let j = headers.indexOf(b.value);
        return i - j;
    }

    const headings = {
        'certificate_number': 'Certificate Number',
        'date': "Date",
        'pump_rating_id': "Basic Model Rating ID",
        'pump_basic_model': "Basic Model Number",
        'pump_brand': "Brand",
        'pump_doe': "DOE Designation",
        'pump_pei': "Basic Model PEI",
        'pump_er': "Basic Model Energy Rating",

        'packager_name': "Packager Name",
        'packager_company': "Packaging Company",
        'packager_email': "Packager Email",
        'installation_site_name': "Installation Site",
        'installation_site_address': "Installation Site Address",
        'motor_manufacturer': "Motor Manufacturer",


        'motor_model': "Motor Model",
        'motor_efficiency': "Motor Efficiency",

        'motor_power': "Motor Power",
        'motor_type': "Motor Type",
        'vfd_manufacturer': "VFD Manufactuer",
        'vfd_model': "VFD Model",
        'vfd_power': "VFD Power",
        'extended_pei': "Extended Product PEI",

        'extended_er': "Extended Product Energy Rating",

    };
    console.log("MAKING Certificate EXCEL");
    console.log(JSON.stringify(rows, null, 2));
    const buffer = toxl(rows, {
        sort: sorter,
        headings: headings
    });
    console.log("RETURNING Certificate EXCEL");
    return buffer;
}

exports.getCertificates = get_listed;
exports.getExportable = prep_for_export;
exports.toXLXS = toXLXS;