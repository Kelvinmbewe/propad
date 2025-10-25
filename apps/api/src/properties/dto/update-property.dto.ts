import { updatePropertySchema as baseUpdatePropertySchema } from './create-property.dto';
import { z } from 'zod';

export const updatePropertySchema = baseUpdatePropertySchema;

export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>;
