new Vue({
    el: '#vue',

    data: {
        search: {
            cnumber: "",
            company: ""
        },
        certificates_pager: new ServersidePager(20, 20),
        certificates: [],
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
    watch: {
        'certificates_pager.search': function (val) {
            this.certificates_pager.page = 0;
            this.search_certificates();
        },
        'certificates_pager.page': function (val) {
            if (this.certificates_pager.page < 0) this.certificates_pager.page = 0;
            if (this.certificates_pager.page > this.certificates_pager.total_pages - 1) {
                this.certificates_pager.page = this.certificates_pager.total_pages - 1;
            }
            this.search_certificates();
        },
    },
    mounted: function () {
        const v = this;

        this.units = $('#vue').data('units');
        this.companies = $('#vue').data('companies');
        const existing_search = $('#vue').data('search')
        if (existing_search) {
            this.search = existing_search
        }
        if (this.search_valid) {
            this.search_certificates();
        }
    },
    computed: {
        search_valid: function () {
            return true
        },
        window: function () {
            return window;
        }
    },
    methods: {
        getConfigLabel(config) {
            var retval = this.configurations.filter(function (c) {
                return config == c.value;
            }).map(function (c) {
                return c.label;
            })
            return retval.length ? retval[0] : "Unknown";
        },
        search_certificates() {
            let v = this;
            $.ajax({
                method: 'post',
                url: `/ratings/certificates/search/${this.certificates_pager.url_suffix}`,
                data: JSON.stringify({
                    search: this.search
                }),
                headers: {
                    'Content-Type': 'application/json'
                },
            }).fail(function (err, body) {
                v.error_message = 'Print failed'
            }).done(function (data) {
                v.certificates = data.certificates;
                v.certificates_pager.total_items = data.total
                v.searched = true;
            });
        },

    }
});