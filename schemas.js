var Schema = require('mongoose').Schema;
exports.init = function init(mongoose) {

    var counters = mongoose.model('counters', {
        name: String,
        seq: Number
    }, "counters");

    exports.Counters = counters;



    exports.getNextRatingsId = async () => {
        return new Promise((resolve, reject) => {
            var ret = counters.collection.findAndModify({
                    name: "ratings"
                }, {}, {
                    $inc: {
                        seq: 1
                    }
                }, {},
                (err, doc) => {
                    if (err) reject(err);
                    else resolve(doc)
                }
            );
        })
    }
    exports.getNextCertificateOrderNumber = async () => {
        return new Promise((resolve, reject) => {
            var ret = counters.collection.findAndModify({
                    name: "certificate_orders"
                }, {}, {
                    $inc: {
                        seq: 1
                    }
                }, {},
                (err, doc) => {
                    if (err) reject(err);
                    else resolve(doc.value.seq)
                }
            );
        })
    }
    exports.getNextCertificateNumber = async () => {
        return new Promise((resolve, reject) => {
            var ret = counters.collection.findAndModify({
                    name: "certificates"
                }, {}, {
                    $inc: {
                        seq: 1
                    }
                }, {},
                (err, doc) => {
                    if (err) reject(err);
                    else resolve(doc.value.seq)
                }
            );
        })
    }



    var resetSchema = {
        email: String,
        expire: {
            type: Date,
            index: {
                expireAfterSeconds: 60 * 60 * 24
            },
            default: new Date()
        }
    }

    var PasswordResets = mongoose.model('password_resets', resetSchema, "password_resets");
    PasswordResets.ensureIndexes(function (err) {

    })
    exports.PasswordResets = PasswordResets;



    var users = mongoose.model('users', {
        name: {
            first: String,
            last: String
        },
        email: String,
        password: String,
        salt: String,
        activationKey: String,
        needsActivation: {
            type: Boolean,
            default: false
        },
        admin: Boolean,
        participant_admin: {
            type: Boolean,
            default: false
        },
        participant_edit: {
            type: Boolean,
            default: false
        },
        participant_view: {
            type: Boolean,
            default: true
        },
        participant: Schema.Types.ObjectId,
    }, "users");

    exports.Users = users;

    var lab_schema = new Schema({
        name: String,
        code: String,
        address: {
            street: String,
            street2: String,
            city: String,
            state: String,
            postal: String,
            country: String
        }
    }, {
        usePushEach: true
    })
    var labs = mongoose.model('labs', lab_schema, "labs");

    exports.Labs = labs;


    var subscriber_schema = new Schema({
        organization: String,
        recipients: [String],
        last_email_date: Date,
        interval_days: Number
    }, {
        usePushEach: true
    });
    var subscribers = mongoose.model('subscribers', subscriber_schema, "subscribers");
    exports.Subscribers = subscribers;

    const certificateTransaction = new Schema({
        date: Date,
        state: String,
        quantity: Number,
        cart: [Schema.Types.Mixed]
    }, {
        usePushEach: true
    })

    var certificate_transactions = mongoose.model('certificate_transactions', certificateTransaction, "certificate_transactions");
    exports.CertificateTransactions = certificate_transactions;

    const certificateSchema = new Schema({
        packager: {
            name: String,
            company: String,
            email: String,
        },
        installation_site: {
            name: String,
            address: {
                street: String,
                city: String,
                state: String,
                zip: String,
                country: String
            }
        },
        pump: {
            type: Schema.Types.ObjectId,
            ref: 'pumps'
        },
        motor: {
            manufacturer: String,
            model: String,
            efficiency: Number,
            power: Number,
            motor_type: String,
        },
        vfd: {
            manufacturer: String,
            model: String,
            power: Number
        },
        pei: Number,
        energy_rating: Number,
        certificate_number: String,
        date: Date,
        transaction: {
            type: Schema.Types.ObjectId,
            ref: 'certificate_transactions'
        }
    }, {
        usePushEach: true
    });


    var certificates = mongoose.model('certificates', certificateSchema, "certificates");
    exports.Certificates = certificates;


    var pumpSchema = new Schema({
        participant: {
            type: Schema.Types.ObjectId,
            ref: 'participants'
        },
        p: {
            type: Schema.Types.ObjectId,
            ref: 'participants'
        },
        date: Date,
        auto: Boolean,
        rating_id: String,
        configuration: String,
        brand: String,
        basic_model: String,
        individual_model: {
            type: String,
            default: "N/A"
        },
        diameter: Number,
        speed: Number,
        laboratory: {
            _id: String,
            name: String,
            code: String,
            address: {
                street: String,
                street2: String,
                city: String,
                state: String,
                postal: String,
                country: String
            }
        },
        motor_method: String,
        section: String,
        stages: Number,
        doe: String,
        bowl_diameter: Number,
        motor_regulated: Boolean,
        motor_power_rated: Number,
        motor_efficiency: Number,
        load120: {
            type: Boolean,
            default: true
        },

        pei: Number,
        pei_baseline: Number,
        pei_method: String, // calculated or manual
        energy_rating: Number,
        energy_savings: Number,

        flow: {
            bep75: Number,
            bep100: Number,
            bep110: Number
        },
        head: {
            bep75: Number,
            bep100: Number,
            bep110: Number
        },
        pump_input_power: {
            bep75: Number,
            bep100: Number,
            bep110: Number,
            bep120: Number
        },
        driver_input_power: {
            bep75: Number,
            bep100: Number,
            bep110: Number
        },
        control_power_input: {
            bep25: Number,
            bep50: Number,
            bep75: Number,
            bep100: Number
        },
        measured_control_power_input: {
            bep25: Number,
            bep50: Number,
            bep75: Number,
            bep100: Number
        },
        measured_control_flow_input: {
            bep25: Number,
            bep5init: Number,
            bep7init: Number,
            bep1init0: Number
        },
        measuredinitcontrol_head_input: {
            bep2init: Number,
            bep5init: Number,
            bep7init: Number,
            bep1init0: Number
        },


        listed: Boolean,
        // defaulting pending for false for backwards compatibility (beta testers already listed)
        pending: {
            type: Boolean,
            default: false
        },
        pending_reasons: [String],
        active_admin: {
            type: Boolean,
            default: true
        },
        note_admin: String,
        revisions: [{
            date: Date,
            note: String,
            correction: {
                type: Boolean,
                default: true
            }
        }],
        results: Schema.Types.Mixed
    }, {
        usePushEach: true
    });



    pumpSchema.statics.countsByParticipant = async (listed, participants) => {
        const pipeline = [];
        if (listed !== undefined) {
            pipeline.push({
                $match: {
                    listed: listed
                }
            })
        }
        pipeline.push({
            $group: {
                _id: '$participant',
                count: {
                    $sum: 1
                }
            }
        })
        const result = await Pumps.aggregate(pipeline);
        if (participants) {
            participants.forEach(p => p.pumpCount = 0)
            for (const count of result) {
                const i = participants.map(p => p._id.toString()).indexOf(count._id.toString());
                console.log(i);
                if (i >= 0) {
                    participants[i].pumpCount = count.count;
                }
            }
            return participants;
        } else
            return result;
    }
    const Pumps = mongoose.model('pumps', pumpSchema);
    exports.Pumps = Pumps;





    const participant_schema = new Schema({
        name: String,
        address: {
            street: String,
            street2: String,
            city: String,
            state: String,
            zip: String,
            country: String
        },
        contact: {
            name: {
                first: String,
                last: String
            },
            phone: String,
            email: String
        },
        active: Boolean,
        pumps: [pumpSchema],
        labs: [Schema.Types.ObjectId],
        purchasing: {
            name: String,
            phone: String,
            email: String
        },
        subscription: {
            pumps: {
                type: String,
                default: "0"
            },
            status: {
                type: String,
                default: "No Account"
            }
        }
    }, {
        usePushEach: true
    });


    var participants = mongoose.model('participants', participant_schema, "participants");

    exports.Participants = participants;


    const label_schema = new Schema({
        load: String,
        speed: Number,
        doe: String,
        max: Number,
        min: Number,
        date: Date
    }, {
        usePushEach: true
    })

    var label = mongoose.model('labels', label_schema, "labels");

    exports.Labels = label;

    counters.count({
        name: 'ratings'
    }, function (err, count) {
        if (count == 0) {
            var counter = new counters();
            counter.name = "ratings";
            counter.seq = 0;
            counter.save();
            console.log("Bootstrapping counters");
        }
    })
    counters.count({
        name: 'certificate_orders'
    }, function (err, count) {
        if (count == 0) {
            var counter = new counters();
            counter.name = "certificate_orders";
            counter.seq = 0;
            counter.save();
            console.log("Bootstrapping counters");
        }
    })
    counters.count({
        name: 'certificates'
    }, function (err, count) {
        if (count == 0) {
            var counter = new counters();
            counter.name = "certificates";
            counter.seq = 0;
            counter.save();

        }
    })

    label.count({}, function (err, count) {
        if (count == 0) {
            console.log("Bootstrapping labels...");
            var loads = ["CL", "VL"];
            var does = ["ESCC", "ESFM", "IL", "RSV", "ST"];
            var speeds = [1800, 3600];
            loads.forEach(function (load) {
                does.forEach(function (doe) {
                    speeds.forEach(function (speed) {
                        var lab = new label();
                        lab.load = load;
                        lab.doe = doe;
                        lab.speed = speed;
                        lab.max = 100;
                        lab.min = 0;
                        lab.date = new Date(2016, 8);
                        lab.save();
                    })
                })
            })
        }

    })



}