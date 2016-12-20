
const nodemailer = require('nodemailer');
const pug = require('pug');
const path = require('path');

const activation_template_file = path.join(__dirname, "../views/registration/activation-email.pug");
const activation_template = pug.compileFile(activation_template_file);

const activation_template_pt_file = path.join(__dirname, "../views/registration/activation-email-plain.pug");
const activation_template_pt = pug.compileFile(activation_template_pt_file);

var smtpConfig = {
    host: process.env.SMTP,
    port: process.env.SMTP_PORT || 25,
    secure: process.env.SMTP_SECURE || false, 
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
    }, 
    tls: {
        rejectUnauthorized:false
    }
};

var transporter = nodemailer.createTransport(smtpConfig);

exports.sendAuthenticationEmail = function (base_url, user, creator) {
    var sender = process.env.SMTP_SENDING_ADDRESS;
    var recipient = process.env.LIVE_EMAIL ? user.email : process.env.SMTP_RECIPIENT_OVERRIDE;

    if (!process.env.LIVE_EMAIL) {
        console.log("WARNING:  Emails are being sent only to " + process.env.SMTP_RECIPIENT_OVERRIDE + ", to enable emailing to actual recipients you must enable live email by setting LIVE_EMAIL environment variable to true.")
    }
    var activation_link = base_url + '/activate/' + user.activationKey;
    
    var template_params = {
            user:user, 
            creator:creator, 
            activation_link:activation_link, 
            base_url:base_url
        };
    
    var mailOptions = {
        from: sender, 
        to: recipient,  
        subject: 'HI Energy Rating Portal - Account Activation', 
        text: activation_template_pt(template_params),
        html: activation_template(template_params)
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        else {
            console.log("Email sent to " + recipient + " successfully");
        }
    });
}