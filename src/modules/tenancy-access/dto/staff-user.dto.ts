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
