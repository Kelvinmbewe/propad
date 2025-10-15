import { OwnerType } from '@prisma/client';
import { z } from 'zod';

export const listPayoutAccountsSchema = z.object({
  ownerId: z.string().optional(),
  ownerType: z.nativeEnum(OwnerType).optional(),
  verified: z
    .string()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      return value === 'true';
    })
    .optional()
});

export type ListPayoutAccountsDto = {
  ownerId?: string;
  ownerType?: OwnerType;
  verified?: boolean;
};
