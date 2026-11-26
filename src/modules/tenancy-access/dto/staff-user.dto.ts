import { z } from 'zod';

export const createStaffUserSchema = z.object({
  id: z.number().nullable().optional(),
  email: z.email().min(5, 'Email is required'),
  password: z.string().min(5, 'Password is required'),
  phone: z.string().min(11, 'Phone is required'),
  full_name: z.string().min(3, 'Name is required'),
  tenant_id: z.number().min(1, 'Tenant is required'),
  status: z.number().default(15),
});

export type CreateStaffUserSchema = z.infer<typeof createStaffUserSchema>;

export const staffUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  tenant_id: z.coerce.number().int().min(1).optional(),
  status_id: z.coerce.number().int().min(1).optional(),
  status: z.string().trim().optional(),
  sort: z.string().optional().default('created_at:desc'),
});

export type StaffUserListQuerySchema = z.infer<typeof staffUserListQuerySchema>;
