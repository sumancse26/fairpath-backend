import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service.js';

describe('TenantsService', () => {
  let service: TenantsService;
  let mockDb: any;

  const superAdminRole = { id: 1n, name: 'Super Admin', isSystem: true, tenantId: null };
  const tenantRole     = { id: 2n, name: 'Tenant Admin', isSystem: false, tenantId: 10n };

  beforeEach(() => {
    mockDb = {
      role:      { findUnique: vi.fn() },
      plan:      { findUnique: vi.fn() },
      tenant:    { findFirst: vi.fn(), create: vi.fn(), count: vi.fn(), findMany: vi.fn() },
      lookupMst: { findUnique: vi.fn() },
      lookupDtl: { findFirst: vi.fn() },
    };
    service = new TenantsService(mockDb);
  });

  const validPayload = { plan_id: 1, name: 'SR Poribahon', domain: 'srporibahon.com' };

  describe('createTenant', () => {
    it('throws UnauthorizedException when roleId is missing', async () => {
      await expect(service.createTenant(validPayload)).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException when role is not a platform system role', async () => {
      mockDb.role.findUnique.mockResolvedValue(tenantRole);
      await expect(service.createTenant(validPayload, '2')).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when role does not exist in DB', async () => {
      mockDb.role.findUnique.mockResolvedValue(null);
      await expect(service.createTenant(validPayload, '99')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when plan does not exist', async () => {
      mockDb.role.findUnique.mockResolvedValue(superAdminRole);
      mockDb.plan.findUnique.mockResolvedValue(null);

      await expect(service.createTenant(validPayload, '1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when tenant name already exists', async () => {
      mockDb.role.findUnique.mockResolvedValue(superAdminRole);
      mockDb.plan.findUnique.mockResolvedValue({ id: 1n, name: 'Basic' });
      mockDb.tenant.findFirst.mockResolvedValue({ id: 10n, name: 'SR Poribahon', domain: 'other.com' });

      await expect(service.createTenant(validPayload, '1')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when tenant domain already exists', async () => {
      mockDb.role.findUnique.mockResolvedValue(superAdminRole);
      mockDb.plan.findUnique.mockResolvedValue({ id: 1n, name: 'Basic' });
      mockDb.tenant.findFirst.mockResolvedValue({ id: 10n, name: 'Different Name', domain: 'srporibahon.com' });

      await expect(service.createTenant(validPayload, '1')).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when lookup values are missing from DB', async () => {
      mockDb.role.findUnique.mockResolvedValue(superAdminRole);
      mockDb.plan.findUnique.mockResolvedValue({ id: 1n, name: 'Basic' });
      mockDb.tenant.findFirst.mockResolvedValue(null);
      mockDb.lookupMst.findUnique.mockResolvedValue(null);

      await expect(service.createTenant(validPayload, '1')).rejects.toThrow(NotFoundException);
    });

    it('creates and returns tenant successfully', async () => {
      mockDb.role.findUnique.mockResolvedValue(superAdminRole);
      mockDb.plan.findUnique.mockResolvedValue({ id: 1n, name: 'Basic' });
      mockDb.tenant.findFirst.mockResolvedValue(null);
      mockDb.lookupMst.findUnique
        .mockResolvedValueOnce({ id: 1n, code: 'TENANT_STATUS' })
        .mockResolvedValueOnce({ id: 2n, code: 'PAYMENT_MODEL' });
      mockDb.lookupDtl.findFirst
        .mockResolvedValueOnce({ id: 10n, code: 'APPLIED' })
        .mockResolvedValueOnce({ id: 20n, code: 'TENANT_COLLECT' });
      mockDb.tenant.create.mockResolvedValue({
        id: 100n, planId: 1n, name: 'SR Poribahon',
        domain: 'srporibahon.com', statusId: 10n, paymentModelId: 20n,
      });

      const result = await service.createTenant(validPayload, '1');

      expect(result).toEqual({ id: '100', planId: '1', name: 'SR Poribahon' });
      expect(mockDb.tenant.create).toHaveBeenCalledWith({
        data: { planId: 1n, name: 'SR Poribahon', domain: 'srporibahon.com', statusId: 10n, paymentModelId: 20n },
      });
    });
  });

  describe('getTenants', () => {
    const sampleTenant = {
      id: 1n,
      planId: 2n,
      name: 'Greenline Paribahan',
      domain: 'greenline.com.bd',
      version: 1,
      createdAt: new Date('2026-01-15T08:00:00Z'),
      updatedAt: new Date('2026-03-20T12:00:00Z'),
      status: { code: 'ACTIVE' },
      paymentModel: { code: 'PLATFORM_COLLECT' },
    };

    it('returns paginated tenants list with default values', async () => {
      mockDb.tenant.count.mockResolvedValue(150);
      mockDb.tenant.findMany.mockResolvedValue([sampleTenant]);

      const result = await service.getTenants({ page: 1, limit: 20, sort: 'created_at:desc' });

      expect(result).toEqual({
        data: [
          {
            id: 1,
            plan_id: 2,
            name: 'Greenline Paribahan',
            status: 'ACTIVE',
            payment_model: 'PLATFORM_COLLECT',
            domain: 'greenline.com.bd',
            created_at: '2026-01-15T08:00:00.000Z',
            updated_at: '2026-03-20T12:00:00.000Z',
            version: 1,
          },
        ],
        meta: {
          total: 150,
          page: 1,
          limit: 20,
          pages: 8,
        },
      });

      expect(mockDb.tenant.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          status: { select: { code: true } },
          paymentModel: { select: { code: true } },
        },
      });
    });

    it('filters by status and custom sort', async () => {
      mockDb.tenant.count.mockResolvedValue(1);
      mockDb.tenant.findMany.mockResolvedValue([sampleTenant]);

      const result = await service.getTenants({
        page: 2,
        limit: 10,
        sort: 'name:asc',
        status: 'ACTIVE',
      });

      expect(result.meta).toEqual({
        total: 1,
        page: 2,
        limit: 10,
        pages: 1,
      });

      expect(mockDb.tenant.findMany).toHaveBeenCalledWith({
        where: { status: { code: 'ACTIVE' } },
        skip: 10,
        take: 10,
        orderBy: { name: 'asc' },
        include: {
          status: { select: { code: true } },
          paymentModel: { select: { code: true } },
        },
      });
    });
  });
});
