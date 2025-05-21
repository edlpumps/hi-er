const nodemailer = require('nodemailer');
const pug = require('pug');
const path = require('path');

const delete_template_file = path.join(__dirname, "../views/registration/delete-email.pug");
const delete_template = pug.compileFile(delete_template_file);

const delete_template_file_pt = path.join(__dirname, "../views/registration/delete-email-plain.pug");
const delete_template_pt = pug.compileFile(delete_template_file_pt);

const estore_template_file = path.join(__dirname, "../views/registration/estore_setup-email.pug");
const estore_template = pug.compileFile(estore_template_file);

const estore_template_pt_file = path.join(__dirname, "../views/registration/estore_setup-email-plain.pug");
const estore_template_pt = pug.compileFile(estore_template_pt_file);

const activation_template_file = path.join(__dirname, "../views/registration/activation-email.pug");
const activation_template = pug.compileFile(activation_template_file);

const activation_template_pt_file = path.join(__dirname, "../views/registration/activation-email-plain.pug");
const activation_template_pt = pug.compileFile(activation_template_pt_file);

const reset_template_file = path.join(__dirname, "../views/registration/password-email.pug");
const reset_template = pug.compileFile(reset_template_file);

const reset_template_pt_file = path.join(__dirname, "../views/registration/password-email-plain.pug");
const reset_template_pt = pug.compileFile(reset_template_pt_file);


const listings_template_file = path.join(__dirname, "../views/subscribers/email.pug");
const listings_template = pug.compileFile(listings_template_file);

const listings_template_pt_file = path.join(__dirname, "../views/subscribers/email-plain.pug");
const listings_template_pt = pug.compileFile(listings_template_pt_file);


var smtpConfig = {
    host: process.env.SMTP,
    port: process.env.SMTP_PORT || 25,
    secure: process.env.SMTP_SECURE || false,
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
};

var transporter = nodemailer.createTransport(smtpConfig);

function sendEmail(mailOptions) {
    if (process.env.SMTP_USERNAME && process.env.SMTP_USERNAME.length > 0)
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log("Could not send email using the following user:")
                console.log(process.env.SMTP_USERNAME)
                return console.log(error);
            } else {
                console.log("Email sent successfully");
            }
        });
    else 
        console.log("Could not send email. No SMTP Username Set");
}


var make_mail_options = function (recipient, subject, template_params, html, text) {
    var sender = process.env.SMTP_SENDING_ADDRESS;
    var recipient = process.env.LIVE_EMAIL ? recipient : process.env.SMTP_RECIPIENT_OVERRIDE;
    var mailOptions = {
        from: sender,
        to: recipient,
        subject: subject,
        html: html(template_params),
        text: text(template_params)
    };
    if (!process.env.LIVE_EMAIL) {
        console.log("WARNING:  Emails are being sent only to " + process.env.SMTP_RECIPIENT_OVERRIDE + ", to enable emailing to actual recipients you must enable live email by setting LIVE_EMAIL environment variable to true.")
    }
    return mailOptions;
}
var make_bcc_mail_options = function (recipients, subject, template_params, html, text) {
    var sender = process.env.SMTP_SENDING_ADDRESS;
    recipients = process.env.LIVE_EMAIL ? recipients : [process.env.SMTP_RECIPIENT_OVERRIDE];
    console.log(recipients);
    var mailOptions = {
        from: sender,
        bcc: recipients.join(","),
        subject: subject,
        html: html(template_params),
        text: text(template_params)
    };
    if (!process.env.LIVE_EMAIL) {
        console.log("WARNING:  Emails are being sent only to " + process.env.SMTP_RECIPIENT_OVERRIDE + ", to enable emailing to actual recipients you must enable live email by setting LIVE_EMAIL environment variable to true.")
    }
    return mailOptions;
}
exports.sendAuthenticationEmail = function (base_url, user, creator) {
    var activation_link = base_url + '/activate/' + user.activationKey;
    var template_params = {
        user: user,
        creator: creator,
        activation_link: activation_link,
        base_url: base_url
    };

    var mailOptions = make_mail_options(user.email, "HI Energy Rating Portal - Account Activation", template_params, activation_template, activation_template_pt);

    sendEmail(mailOptions);
}
exports.sendPasswordReset = function (base_url, reset, user) {
    var template_params = {
        reset_link: base_url + '/reset/' + reset._id,
        base_url: base_url,
        user: user
    };

    var mailOptions = make_mail_options(reset.email, "HI Energy Rating Portal - Password Reset", template_params, reset_template, reset_template_pt);

    sendEmail(mailOptions);
}

exports.sendDeletionNotification = function (deleted, actor) {
    var template_params = {
        deleted: deleted,
        actor: actor
    };

    var mailOptions = make_mail_options(deleted.email, "HI Energy Rating Portal - Account Deletion", template_params, delete_template, delete_template_pt);

    sendEmail(mailOptions);
}

//TODO Test Email Listings
exports.sendListings = function (recipients, pump_excel, circulator_excel, certificate_excel, type_of_data) {
    var template_params = {};
    
    console.log(recipients);
    var mailOptions = make_bcc_mail_options(recipients, "HI Energy Rating Portal - Energy Rating Listings", template_params, listings_template, listings_template_pt);
    mailOptions.attachments = [];
    if (pump_excel) mailOptions.attachments.push({
        filename: 'ci_energy_ratings-'+type_of_data+'.xlsx',
        content: pump_excel
    });
    if (circulator_excel) mailOptions.attachments.push({
        filename: 'circulator_energy_ratings-'+type_of_data+'.xlsx',
        content: circulator_excel
    });
    if (certificate_excel) mailOptions.attachments.push({
        filename: 'extended_product_certificates-'+type_of_data+'.xlsx',
        content: certificate_excel
    });
    sendEmail(mailOptions);
}

exports.sendEStoreSetup = function (recipient, participant) {
    var template_params = {
        participant: participant
    };

    var mailOptions = make_mail_options(recipient, "HI Energy Rating Portal - New Account", template_params, estore_template, estore_template_pt);

    sendEmail(mailOptions);
}