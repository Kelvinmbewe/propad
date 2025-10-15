import ky from 'ky';
import { DashboardMetricsSchema, type DashboardMetrics } from './schemas';

interface SDKOptions {
  baseUrl: string;
  token?: string;
}

export function createSDK({ baseUrl, token }: SDKOptions) {
  const client = ky.create({
    prefixUrl: baseUrl,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });

  return {
    metrics: {
      dashboard: async () => client.get('metrics/dashboard').json<DashboardMetrics>().then((data) => DashboardMetricsSchema.parse(data))
    }
  };
}

export type SDK = ReturnType<typeof createSDK>;
