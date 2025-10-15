import { createPropertySchema } from './create-property.dto';
import { z } from 'zod';

export const updatePropertySchema = createPropertySchema.partial();

export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>;
