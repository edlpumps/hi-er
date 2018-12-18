new Vue({
    el: '#vue',

    data: {
        search: {
            ratind_id: "",
            basic_model: "",
            participant: "",
            brand: "",
        },
        searching: false,
        pumps: [],
        participants: [],
        brands: [],
        searched: false,
        units: null,
        configurations: [{
                value: "bare",
                label: "Bare Pump"
            },
            {
                value: "pump_motor",
                label: "Pump + Motor"
            },
            {
                value: "pump_motor_cc",
                label: "Pump + Motor w/ Continuous Controls"
            },
            {
                value: "pump_motor_nc",
                label: "Pump + Motor w/ Non-continuous Controls"
            }
        ]


    },

    mounted: function () {
        const v = this;
        this.search = $('#vue').data('search');
        this.participants = $('#vue').data('participants');
        this.units = $('#vue').data('units');
        this.search.min_er = 0;
        this.search.max_er = 100;
        this.search.cl = true;
        this.search.vl = false;
        this.search.esfm = true;
        this.search.escc = true;
        this.search.il = true;
        this.search.rsv = true;
        this.search.st = true;
    },
    computed: {
        search_valid: function () {
            return this.search.rating_id || this.search.basic_model || this.search.participant
        }
    },
    methods: {
        search_pumps: function () {
            let v = this;
            this.searching = true;
            $.ajax({
                method: 'post',
                url: '/ratings/search',
                data: JSON.stringify({
                    search: this.search
                }),
                headers: {
                    'Content-Type': 'application/json'
                },
            }).fail(function (err, body) {
                v.searching = false;
                v.error_message = 'Print failed'
            }).done(function (data) {
                v.pumps = data.pumps;
                v.searched = true;
                v.searching = false;
            });
        },
        load_brands: function () {
            let q = '';
            const v = this;
            if (this.search.participant) {
                q = "?name=" + encodeURIComponent(this.search.participant);
            }
            const url = "/ratings/api/brands" + q;
            $.getJSON(url, function (data) {
                v.brands = data.brands;
            }).fail(function (err) {
                console.log(err);
            });
        },
        getConfigLabel: function (config) {
            var retval = this.configurations.filter(function (c) {
                return config == c.value;
            }).map(function (c) {
                return c.label;
            })
            return retval.length ? retval[0] : "Unknown";
        }
    }
});