class ServersidePager {
    constructor(page_size, pages) {
        this.page = 0;
        this.page_size = page_size || 10;
        this.total_pages = 1;
        this.search = "";
        this.items = 0;
        this.page_display_max = pages || 5
    }
    get skip() {
        return this.page * this.page_size;
    }
    get limit() {
        return this.page_size;
    }
    get url_suffix() {
        const suffix = `${this.skip}/${this.limit}?q=${encodeURIComponent(this.search)}`;
        return suffix;
    }
    set total_items(total) {
        if (total > 0) {
            this.total_pages = Math.floor(total / this.page_size);
            if (this.total_pages < (total / this.page_size)) {
                this.total_pages++;
            }
        } else {
            this.total_pages = 0;
        }
        this.items = total;
    }
    get pages() {
        if (this.total_pages) {
            const pages = Array.from(Array(this.total_pages).keys());
            const total = this.page_display_max;
            if (pages.length > total) {
                let first = Math.floor(Math.max(0, this.page - total / 2));
                let last = Math.floor(Math.min(this.page + total / 2, pages.length - 1));
                if (last - first < total) {
                    const diff = total - (last - first)
                    last += diff;
                    if (last > pages.length - 1) {
                        last = pages.length;
                        if (last - first < total) {
                            const diff = total - (last - first)
                            first -= diff;
                        }

                    }
                }

                const retval = pages.slice(first, last);

                if (retval[0] != 0) retval[0] = 0;
                if (retval[retval.length - 1] != pages.length - 1) {
                    retval[retval.length - 1] = pages.length - 1;
                }
                return retval;
            } else {
                return pages;
            }
        } else {
            return [];
        }
    }
}