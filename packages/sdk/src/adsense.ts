// Local type definition matching Prisma schema
export interface AdSenseDailyStat {
    id: string;
    date: Date;
    impressions: number;
    clicks: number;
    revenueCents: number;
    syncedAt: Date;
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
