import type { KyInstance } from 'ky';

export function createReferralsResource(client: KyInstance) {
    return {
        getCode: async () => client.get('referrals/code').json<any>(),
        my: async () => client.get('referrals/my').json<any[]>(),
        stats: async () => client.get('referrals/stats/my').json<any>(),
        admin: {
            all: async () => client.get('admin/referrals').json<any[]>(),
            resolve: async (id: string) => client.post(`admin/referrals/${id}/resolve`).json<any>()
        }
    };
}
