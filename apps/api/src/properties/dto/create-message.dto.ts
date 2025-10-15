import { z } from 'zod';

export const createMessageSchema = z
  .object({
    body: z.string().min(1, 'Message cannot be empty').max(1000, 'Message is too long')
  })
  .strict();

export type CreateMessageDto = z.infer<typeof createMessageSchema>;
