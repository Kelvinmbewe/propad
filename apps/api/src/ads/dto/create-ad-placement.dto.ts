import {
  AdCreativeType,
  AdPlacementPage,
  AdPlacementPosition,
} from "@prisma/client";
import { z } from "zod";

export const createAdPlacementSchema = z.object({
  code: z.string().min(3).max(40),
  name: z.string().min(3).max(120),
  description: z.string().max(240).optional(),
  page: z.nativeEnum(AdPlacementPage),
  position: z.nativeEnum(AdPlacementPosition),
  allowedTypes: z.array(z.nativeEnum(AdCreativeType)).optional(),
  allowDirect: z.boolean().optional(),
  allowAdSense: z.boolean().optional(),
  policyCompliant: z.boolean().optional(),
});

export type CreateAdPlacementDto = z.infer<typeof createAdPlacementSchema>;
