import QuickBooks from 'node-quickbooks-promise';

class QuickBooksClientWrapper {
    constructor() {
        this.client = new QuickBooks(
            process.env.QUICKBOOKS_CLIENT,
            process.env.QUICKBOOKS_SECRET,
            process.env.QUICKBOOKS_ACCESS_TOKEN,
            false, // no token secret for OAuth 2.0
            process.env.QUICKBOOKS_REALMID,
            false, // use the sandbox?
            true, // enable debugging?
            null, // set minor version or null for the latest version
            '2.0', // OAuth version
            process.env.QUICKBOOKS_REFRESH_TOKEN
        );
    }

    async checkAccessToken() {
        let refreshBool = false;
        const timeNow = new Date();
        const lastRefresh = process.env.QUICKBOOKS_LAST_REFRESH === '' ? new Date(timeNow - (60 * 1000 * 60)) : new Date(process.env.QUICKBOOKS_LAST_REFRESH);
        const timeDiff = (timeNow - lastRefresh) / (1000 * 60);

        console.log(`timeNow: ${timeNow}, lastRefresh: ${lastRefresh.toISOString()}, timeDiff: ${timeDiff}`);

        if (timeDiff >= 55) { await refreshAccessToken(); refreshBool = true };

        return refreshBool;
    }

    async refreshAccessToken() {
        try {
            const refresh_response = await this.client.refreshAccessToken();
            const dateNow = new Date();
            console.log(`Access Token Refreshed at: ${dateNow.toString()}`)
            console.log(`Refresh Response: ${refresh_response}`)

            this.client.token = refresh_response.access_token
            this.client.refreshToken = refresh_response.refresh_token

            process.env.QUICKBOOKS_ACCESS_TOKEN = refresh_response.access_token
            process.env.QUICKBOOKS_REFRESH_TOKEN = refresh_response.refresh_token
            process.env.QUICKBOOKS_LAST_REFRESH = dateNow

        } catch (err) { console.log('Error at method: quickbooks/refreshAccessToken(): ', err); }
    }

    async makeRequest(requestMethod, ...args) {
        await this.checkAccessToken(this.client);
        return this.client[requestMethod](...args);
    }
}

// Usage
// const qbClientWrapper = new QuickBooksClientWrapper();
// Example usage: qbClientWrapper.makeRequest('createInvoice', invoiceDetails);

export { qbClientWrapper };
