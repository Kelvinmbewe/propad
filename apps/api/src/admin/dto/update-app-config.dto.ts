import { z } from 'zod';
import { appConfigSchema } from '../../app-config/app-config.schema';

export const updateAppConfigSchema = z.object({
  config: appConfigSchema
});

export type UpdateAppConfigDto = z.infer<typeof updateAppConfigSchema>;

