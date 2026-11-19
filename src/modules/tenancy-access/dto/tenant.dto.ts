import { z } from 'zod';

export const createTenantSchema = z.object({
  id: z.number().nullable().optional(),
  plan_id: z.number().min(1, 'Plan ID is required'),
  name: z.string().min(1, 'Tenant name is required'),
  domain: z.string().nullable().optional(),
});

export type CreateTenantType = z.infer<typeof createTenantSchema>;
