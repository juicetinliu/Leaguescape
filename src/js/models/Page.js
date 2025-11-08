class Page {
    constructor(page) {
        this.page = page;
    }

    async show() {
        console.log("Showing " + this.page);
    }
    async cleanup() {
        console.log("Cleaning up " + this.page);
    }
}

export default Page;