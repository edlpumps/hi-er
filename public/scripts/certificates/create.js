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
        const saved = localStorage.getItem('certificates_create_search');
        console.log(saved);
        console.log(JSON.stringify(this.participants, null, 2))
        if (saved) {
            this.restoring = true;
            const _saved = JSON.parse(saved);
            if (_saved.rating_id) this.search.rating_id = _saved.rating_id;
            if (_saved.basic_model) this.search.basic_model = _saved.basic_model;
            if (_saved.participant) this.search.participant = _saved.participant;
            if (this.search.participant && _saved.brand)
                this.search.brand = _saved.brand;
            console.log(this.search);
            if (this.search_valid) {
                this.load_brands();
                this.search_pumps();
            }
        }
    },
    computed: {
        search_valid: function () {
            return this.search.rating_id || this.search.basic_model || this.search.participant
        }
    },
    methods: {
        search_pumps: function () {
            console.log("Circ Search Parameters: "+JSON.stringify(this.search,null,2));
            localStorage.setItem('certificates_create_search', JSON.stringify(this.search));
							
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