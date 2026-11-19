import { describe, expect, it } from 'vitest';
import { loginSchema } from './login.dto.js';
import { refreshTokenSchema } from './refresh-token.dto.js';

describe('Auth Zod Schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'securePassword123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid email address');
      }
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Password is required');
      }
    });

    it('trims email whitespace automatically', () => {
      const result = loginSchema.safeParse({
        email: '   user@example.com   ',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });
  });

  describe('refreshTokenSchema', () => {
    it('accepts valid token string', () => {
      const result = refreshTokenSchema.safeParse({
        refreshToken: 'valid-token',
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty object (optional token for cookie fallback)', () => {
      const result = refreshTokenSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
