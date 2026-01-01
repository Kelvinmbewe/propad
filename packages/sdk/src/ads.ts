export class AdsModule {
    constructor(private client: any) { }

    async getActive() {
        return this.client.get('/ads/active');
    }

    async getStats(id: string) {
        return this.client.get(`/ads/stats/${id}`);
    }
}
