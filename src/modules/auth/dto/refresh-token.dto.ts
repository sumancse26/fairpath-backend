import { z } from 'zod';

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
