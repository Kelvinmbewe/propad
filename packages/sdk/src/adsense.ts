// Local type definition matching SDK response
export interface AdSenseDailyStat {
    id: string;
    date: string;
    impressions: number;
    clicks: number;
    revenueMicros: string;
    syncedAt?: Date;
}

export class AdSenseClient {
    constructor(private client: any) { }

    async getStats(): Promise<AdSenseDailyStat[]> {
        return this.client.get('/adsense/stats').json();
    }

    async triggerSync(): Promise<void> {
        await this.client.get('/adsense/sync');
    }
}
