import { AxiosInstance } from 'axios';
import { AdSenseDailyStat } from '@prisma/client';

export class AdSenseClient {
    constructor(private axios: AxiosInstance) { }

    async getStats(): Promise<AdSenseDailyStat[]> {
        const { data } = await this.axios.get('/adsense/stats');
        return data;
    }

    async triggerSync(): Promise<void> {
        await this.axios.get('/adsense/sync');
    }
}
