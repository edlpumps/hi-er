exports.params = function(search_parameters, allow_inactive) {
    var search = search_parameters || {};
    var inactive_allowed = allow_inactive || false;
    if (!search.rating_id) {
        // If the search does not include a rating ID, inactive pumps
        // are never returned.
        inactive_allowed = false;
    }
    var operators = [];
    operators.push({ "$unwind": "$pumps" });

    operators.push({
        $group: {
            _id: "$pumps._id",
            rating_id: { $first: "$pumps.rating_id" },
            participant_id: { $first: "$_id" },
            participant: { $first: "$pumps.participant" },
            participant_active: { $first: "$active" },
            participant_status: { $first: "$subscription.status" },
            configuration: { $first: "$pumps.configuration" },
            basic_model: { $first: "$pumps.basic_model" },
            individual_model: { $first: "$pumps.individual_model" },
            brand: { $first: "$pumps.brand" },
            diameter: { $first: "$pumps.diameter" },
            speed: { $first: "$pumps.speed" },
            laboratory: { $first: "$pumps.laboratory" },
            stages: { $first: "$pumps.stages" },
            doe: { $first: "$pumps.doe" },
            pei: { $first: "$pumps.pei" },
            //------- Added for export to utilities
            driver_input_power: { $first: "$pumps.driver_input_power" },
            control_power_input: { $first: "$pumps.control_power_input" },
            motor_power_rated: { $first: "$pumps.motor_power_rated" },
            motor_power_rated_results: { $first: "$pumps.results.motor_power_rated" },
            flow: { $first: "$pumps.flow" },
            date: { $first: "$pumps.date" },
            head: { $first: "$pumps.head" },
            load120: { $first: "$pump.load120" },

            energy_rating: { $first: "$pumps.energy_rating" },
            energy_savings: { $first: "$pumps.energy_savings" },
            listed: { $first: "$pumps.listed" },
            pending: { $first: { $ifNull: ["$pumps.pending", false] } },
            active_admin: { $first: "$pumps.active_admin" },
        }
    });

    var criteria = [
        { doe: { $ne: null } },
        { rating_id: { $ne: null } },
        { participant: { $ne: null } },
        { participant_active: { $eq: true } },
        { participant_status: { $eq: 'Active' } },
        { configuration: { $ne: null } },
        { basic_model: { $ne: null } },
        { diameter: { $ne: null } },
        { speed: { $ne: null } },
        { laboratory: { $ne: null } },
        { stages: { $ne: null } },
        { doe: { $ne: null } },
        { pei: { $ne: null } },
        { energy_rating: { $ne: null } },
        { energy_savings: { $ne: null } },
        { active_admin: { $eq: true } },
        { pending: { $eq: false } }
    ];
    if (!inactive_allowed) {
        criteria.push({ listed: { $eq: true } });
    }

    operators.push({
        $match: {
            $and: criteria
        }
    });
    if (search.rating_id) {
        operators.push({ $match: { rating_id: search.rating_id } });
    }
    if (search.participant) {
        operators.push({ $match: { participant: search.participant } });
    }
    if (search.basic_model) {
        operators.push({ $match: { basic_model: search.basic_model } });
    }
    if (search.participant && search.brand) {
        operators.push({ $match: { brand: search.brand } });
    }
    if (search) {
        var configs = [];
        if (search.cl) {
            configs.push({ configuration: "bare" });
            configs.push({ configuration: "pump_motor" });
        }
        if (search.vl) {
            configs.push({ configuration: "pump_motor_cc" });
            configs.push({ configuration: "pump_motor_nc" });
        }
        if (configs.length > 0) {
            operators.push({ $match: { $or: configs } });
        }

        var does = [];
        if (search.esfm) {
            does.push({ doe: "ESFM" });
        }
        if (search.escc) {
            does.push({ doe: "ESCC" });
        }
        if (search.il) {
            does.push({ doe: "IL" });
        }
        if (search.rsv) {
            does.push({ doe: "RSV" });
        }
        if (search.st) {
            does.push({ doe: "ST" });
        }
        if (does.length > 0) {
            operators.push({ $match: { $or: does } });
        }

        var min_er = search.min_er || 0;
        var max_er = search.max_er || 100;
        operators.push({ $match: { energy_rating: { $gte: min_er, $lte: max_er } } });
    }
    return operators;
}