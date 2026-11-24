import { z } from 'zod';

export const createTenantSchema = z.object({
  id: z.number().nullable().optional(),
  plan_id: z.number().min(1, 'Plan ID is required'),
  name: z.string().min(1, 'Tenant name is required'),
  domain: z.string().nullable().optional(),
});

export type CreateTenantType = z.infer<typeof createTenantSchema>;

export const tenantListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().optional().default('created_at:desc'),
  status: z.string().optional(),
});

export type TenantListQueryType = z.infer<typeof tenantListQuerySchema>;

export const updateTenantSchema = z.object({
  plan_id: z.number().min(1, 'Plan ID is required'),
  name: z.string().min(1, 'Tenant name is required'),
  status_id: z.number().min(1, 'Status is required'),
  payment_model_id: z.number().min(1, 'Payment model is required'),
  domain: z.string().nullable().optional(),
});

export type UpdateTenantType = z.infer<typeof updateTenantSchema>;
export type UpdateTenantSchema = UpdateTenantType;
