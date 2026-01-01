export class WalletModule {
    constructor(private client: any) { }

    async getBalance() {
        // This might need a specific endpoint if we want to expose it to the web
        return this.client.get('/wallet/balance');
    }
}
