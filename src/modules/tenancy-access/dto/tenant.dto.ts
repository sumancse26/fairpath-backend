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

export const createBranchSchema = z.object({
  tenant_id: z.number().int().min(1, 'Tenant ID is required'),
  code: z.string().trim().min(1, 'Branch code is required').max(50),
  name: z.string().trim().min(1, 'Branch name is required').max(100),
  city: z.string().trim().max(100).nullable().optional(),
  address: z.string().trim().nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
});

export type CreateBranchType = z.infer<typeof createBranchSchema>;
