import {
  AdCreativeType,
  AdPlacementPage,
  AdPlacementPosition,
} from "@prisma/client";
import { z } from "zod";

export const updateAdPlacementSchema = z.object({
  code: z.string().min(3).max(40).optional(),
  name: z.string().min(3).max(120).optional(),
  description: z.string().max(240).optional().nullable(),
  page: z.nativeEnum(AdPlacementPage).optional(),
  position: z.nativeEnum(AdPlacementPosition).optional(),
  allowedTypes: z.array(z.nativeEnum(AdCreativeType)).optional(),
  allowDirect: z.boolean().optional(),
  allowAdSense: z.boolean().optional(),
  policyCompliant: z.boolean().optional(),
});

export type UpdateAdPlacementDto = z.infer<typeof updateAdPlacementSchema>;
