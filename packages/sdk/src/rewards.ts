export class RewardsModule {
    constructor(private client: any) { }

    async getMyRewards() {
        return this.client.get('/rewards/my');
    }

    async getPools() {
        return this.client.get('/rewards/pools');
    }
}
