const basic_criteria = [{
        doe: {
            $ne: null
        }
    },
    {
        rating_id: {
            $ne: null
        }
    }, {
        configuration: {
            $ne: null
        }
    }, {
        basic_model: {
            $ne: null
        }
    }, {
        diameter: {
            $ne: null
        }
    }, {
        speed: {
            $ne: null
        }
    }, {
        laboratory: {
            $ne: null
        }
    }, {
        stages: {
            $ne: null
        }
    }, {
        doe: {
            $ne: null
        }
    }, {
        pei: {
            $ne: null
        }
    }, {
        energy_rating: {
            $ne: null
        }
    }, {
        energy_savings: {
            $ne: null
        }
    }, {
        active_admin: {
            $eq: true
        }
    }, {
        $or: [{
            pending: {
                $eq: false
            }
        }, {
            pending: {
                $exists: false
            }
        }]

    }
];
exports.params = function (search_parameters, allow_inactive) {
    var search = search_parameters || {};
    var inactive_allowed = allow_inactive || false;
    if (!search.rating_id) {
        // If the search does not include a rating ID, inactive pumps
        // are never returned.
        inactive_allowed = false;
    }
    var operators = [];



    var criteria = basic_criteria;
    if (!inactive_allowed) {
        criteria.push({
            listed: {
                $eq: true
            }
        });
    }

    operators.push({
        $match: {
            $and: criteria
        }
    });

    if (search.rating_id) {
        operators.push({
            $match: {
                rating_id: search.rating_id
            }
        });
    }

    if (search.basic_model) {
        operators.push({
            $match: {
                basic_model: search.basic_model
            }
        });
    }

    if (search.participant && search.brand) {
        operators.push({
            $match: {
                brand: search.brand
            }
        });
    }

    operators.push({
        $lookup: {
            from: 'participants',
            localField: 'participant',
            foreignField: '_id',
            as: 'joined_participant'
        }
    })

    operators.push({
        $unwind: '$joined_participant'
    })

    operators.push({
        $match: {
            $and: [{
                    joined_participant: {
                        $ne: null
                    }
                },
                {
                    'joined_participant.active': {
                        $eq: true
                    }
                },
                {
                    'joined_participant.subscription.status': {
                        $eq: 'Active'
                    }
                },
            ]
        }
    });

    if (search.participant) {
        operators.push({
            $match: {
                'joined_participant.name': search.participant
            }
        });
    }

    if (search) {
        var configs = [];
        if (search.cl) {
            configs.push({
                configuration: "bare"
            });
            configs.push({
                configuration: "pump_motor"
            });
        }
        if (search.vl) {
            configs.push({
                configuration: "pump_motor_cc"
            });
            configs.push({
                configuration: "pump_motor_nc"
            });
        }
        if (configs.length > 0) {
            operators.push({
                $match: {
                    $or: configs
                }
            });
        }

        var does = [];
        if (search.esfm) {
            does.push({
                doe: "ESFM"
            });
        }
        if (search.escc) {
            does.push({
                doe: "ESCC"
            });
        }
        if (search.il) {
            does.push({
                doe: "IL"
            });
        }
        if (search.rsv) {
            does.push({
                doe: "RSV"
            });
        }
        if (search.st) {
            does.push({
                doe: "ST"
            });
        }
        if (does.length > 0) {
            operators.push({
                $match: {
                    $or: does
                }
            });
        }

        var min_er = search.min_er || 0;
        var max_er = search.max_er || 100;
        operators.push({
            $match: {
                energy_rating: {
                    $gte: min_er,
                    $lte: max_er
                }
            }
        });
    }

    //console.log(JSON.stringify(operators, null, 2));
    return operators;
}