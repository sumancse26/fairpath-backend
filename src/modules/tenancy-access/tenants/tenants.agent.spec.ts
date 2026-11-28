import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service.js';
import {
  agentListQuerySchema,
  createAgentSchema,
} from '../dto/tenant.dto.js';
import type { AuthUser } from '../../auth/types/auth.types.js';

describe('TenantsService - Agents', () => {
  let service: TenantsService;
  let mockDb: any;

  const tenantUser: AuthUser = {
    id: '10',
    email: 'admin@tenant1.com',
    fullName: 'Tenant One Admin',
    phone: null,
    status: '15',
    isSuperAdmin: false,
    roleId: '2',
    roleName: 'Tenant Admin',
    tenantId: '1',
    tenantName: 'Tenant One',
    branchId: null,
  };

  const superAdminUser: AuthUser = {
    ...tenantUser,
    id: '1',
    isSuperAdmin: true,
    tenantId: null,
    tenantName: null,
  };

  const validPayload = {
    branch_id: 10,
    name: 'Karim Travels',
    phone: '+8801711000001',
    email: 'karim@agent.com',
    credit_limit: 500000,
    current_balance: 0,
    commission_rate: 5.5,
  };

  beforeEach(() => {
    mockDb = {
      tenant: { findUnique: vi.fn() },
      branch: { findUnique: vi.fn() },
      lookupDtl: { findFirst: vi.fn(), findUnique: vi.fn() },
      agent: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };
    service = new TenantsService(mockDb);
  });

  describe('DTO schemas', () => {
    it('applies defaults on createAgentSchema', () => {
      const parsed = createAgentSchema.parse({ name: '  Karim Travels  ' });
      expect(parsed).toEqual({
        name: 'Karim Travels',
        credit_limit: 0,
        current_balance: 0,
        commission_rate: 0,
      });
    });

    it('rejects negative credit_limit or invalid commission_rate', () => {
      expect(
        createAgentSchema.safeParse({ name: 'Test', credit_limit: -1 }).success,
      ).toBe(false);
      expect(
        createAgentSchema.safeParse({ name: 'Test', commission_rate: 120 })
          .success,
      ).toBe(false);
    });

    it('applies defaults on agentListQuerySchema', () => {
      const parsed = agentListQuerySchema.parse({});
      expect(parsed).toEqual({
        page: 1,
        limit: 20,
        sort: 'id:desc',
      });
    });
  });

  describe('createAgent', () => {
    it('throws UnauthorizedException when user is not authenticated', async () => {
      await expect(
        service.createAgent(validPayload, '1', undefined),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException when user is not super admin, tenant admin, or operations manager', async () => {
      const counterStaff: AuthUser = {
        ...tenantUser,
        roleId: '4',
        roleName: 'Counter Staff',
      };
      await expect(
        service.createAgent(validPayload, undefined, counterStaff),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows Operations Manager (roleId 3) of the tenant to create an agent', async () => {
      const operationsManager: AuthUser = {
        ...tenantUser,
        roleId: '3',
        roleName: 'Operations Manager',
      };
      mockDb.tenant.findUnique.mockResolvedValue({ id: 1n });
      mockDb.branch.findUnique.mockResolvedValue({ id: 10n, tenantId: 1n });
      mockDb.agent.findFirst.mockResolvedValue(null);
      mockDb.lookupDtl.findFirst.mockResolvedValue({ id: 11n });
      mockDb.agent.create.mockResolvedValue({
        id: 52n,
        tenantId: 1n,
        name: 'Karim Travels',
        status: { code: 'ACTIVE' },
      });

      const result = await service.createAgent(
        validPayload,
        undefined,
        operationsManager,
      );

      expect(result).toEqual({
        id: '52',
        tenant_id: '1',
        name: 'Karim Travels',
        status: 'ACTIVE',
      });
    });

    it('throws ForbiddenException when tenant user has no tenantId in JWT', async () => {
      const unassigned: AuthUser = { ...tenantUser, tenantId: null };
      await expect(
        service.createAgent(validPayload, undefined, unassigned),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws UnauthorizedException when super admin has no cookie tenant_id', async () => {
      await expect(
        service.createAgent(validPayload, undefined, superAdminUser),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException when super admin cookie tenant_id is invalid', async () => {
      await expect(
        service.createAgent(validPayload, 'abc', superAdminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when tenant does not exist', async () => {
      mockDb.tenant.findUnique.mockResolvedValue(null);
      await expect(
        service.createAgent(validPayload, undefined, tenantUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when branch_id does not exist', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 1n });
      mockDb.branch.findUnique.mockResolvedValue(null);

      await expect(
        service.createAgent(validPayload, undefined, tenantUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when branch belongs to another tenant', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 1n });
      mockDb.branch.findUnique.mockResolvedValue({ id: 10n, tenantId: 2n });

      await expect(
        service.createAgent(validPayload, undefined, tenantUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException on duplicate agent name or email for tenant', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 1n });
      mockDb.branch.findUnique.mockResolvedValue({ id: 10n, tenantId: 1n });
      mockDb.agent.findFirst.mockResolvedValue({
        id: 99n,
        name: 'Karim Travels',
      });

      await expect(
        service.createAgent(validPayload, undefined, tenantUser),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when explicit status_id is not AGENT_STATUS', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 1n });
      mockDb.branch.findUnique.mockResolvedValue({ id: 10n, tenantId: 1n });
      mockDb.agent.findFirst.mockResolvedValue(null);
      mockDb.lookupDtl.findUnique.mockResolvedValue({
        id: 99n,
        lookupMst: { code: 'OTHER_STATUS' },
      });

      await expect(
        service.createAgent(
          { ...validPayload, status_id: 99 },
          undefined,
          tenantUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates agent for tenant user using JWT tenantId and default ACTIVE status', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 1n });
      mockDb.branch.findUnique.mockResolvedValue({ id: 10n, tenantId: 1n });
      mockDb.agent.findFirst.mockResolvedValue(null);
      mockDb.lookupDtl.findFirst.mockResolvedValue({ id: 11n });
      mockDb.agent.create.mockResolvedValue({
        id: 50n,
        tenantId: 1n,
        branchId: 10n,
        name: 'Karim Travels',
        phone: '+8801711000001',
        email: 'karim@agent.com',
        creditLimit: 500000n,
        currentBalance: 0n,
        commissionRate: '5.50',
        statusId: 11n,
        status: { code: 'ACTIVE' },
        branch: { name: 'Dhaka Main' },
      });

      const result = await service.createAgent(
        validPayload,
        '999',
        tenantUser,
      );

      expect(mockDb.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 1n },
      });
      expect(result).toEqual({
        id: '50',
        tenant_id: '1',
        name: 'Karim Travels',
        status: 'ACTIVE',
      });
    });

    it('allows super admin to create agent for tenant_id from cookie', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 5n });
      mockDb.agent.findFirst.mockResolvedValue(null);
      mockDb.lookupDtl.findFirst.mockResolvedValue({ id: 11n });
      mockDb.agent.create.mockResolvedValue({
        id: 51n,
        tenantId: 5n,
        branchId: null,
        name: 'Sylhet Agent',
        phone: null,
        email: null,
        creditLimit: 0n,
        currentBalance: 0n,
        commissionRate: '0.00',
        statusId: 11n,
        status: { code: 'ACTIVE' },
        branch: null,
      });

      const result = await service.createAgent(
        {
          name: 'Sylhet Agent',
          credit_limit: 0,
          current_balance: 0,
          commission_rate: 0,
        },
        '5',
        superAdminUser,
      );

      expect(result).toEqual({
        id: '51',
        tenant_id: '5',
        name: 'Sylhet Agent',
        status: 'ACTIVE',
      });
    });

    it('updates an existing agent when id is provided', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 1n });
      mockDb.branch.findUnique.mockResolvedValue({ id: 10n, tenantId: 1n });
      mockDb.agent.findUnique.mockResolvedValue({
        id: 50n,
        tenantId: 1n,
        statusId: 11n,
      });
      mockDb.agent.findFirst.mockResolvedValue(null);
      mockDb.agent.update.mockResolvedValue({
        id: 50n,
        tenantId: 1n,
        name: 'Karim Travels Updated',
        status: { code: 'ACTIVE' },
      });

      const result = await service.createAgent(
        { ...validPayload, id: 50, name: 'Karim Travels Updated' },
        undefined,
        tenantUser,
      );

      expect(mockDb.agent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 1n,
            id: { not: 50n },
          }),
        }),
      );
      expect(mockDb.agent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 50n },
          data: expect.objectContaining({
            name: 'Karim Travels Updated',
            statusId: 11n,
          }),
        }),
      );
      expect(result).toEqual({
        id: '50',
        tenant_id: '1',
        name: 'Karim Travels Updated',
        status: 'ACTIVE',
      });
    });

    it('throws NotFoundException when updating a non-existent agent id', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 1n });
      mockDb.branch.findUnique.mockResolvedValue({ id: 10n, tenantId: 1n });
      mockDb.agent.findUnique.mockResolvedValue(null);

      await expect(
        service.createAgent(
          { ...validPayload, id: 999 },
          undefined,
          tenantUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when updating an agent belonging to another tenant', async () => {
      mockDb.tenant.findUnique.mockResolvedValue({ id: 1n });
      mockDb.branch.findUnique.mockResolvedValue({ id: 10n, tenantId: 1n });
      mockDb.agent.findUnique.mockResolvedValue({
        id: 50n,
        tenantId: 2n,
        statusId: 11n,
      });

      await expect(
        service.createAgent(
          { ...validPayload, id: 50 },
          undefined,
          tenantUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAgents', () => {
    const defaultQuery = { page: 1, limit: 20, sort: 'id:desc' };

    it('throws ForbiddenException when tenant user has no tenantId in JWT', async () => {
      const unassigned: AuthUser = { ...tenantUser, tenantId: null };
      await expect(
        service.getAgents(defaultQuery, undefined, unassigned),
      ).rejects.toThrow(ForbiddenException);
    });

    it('scopes tenant user to JWT tenantId and ignores cookie', async () => {
      mockDb.agent.count.mockResolvedValue(1);
      mockDb.agent.findMany.mockResolvedValue([
        {
          id: 50n,
          tenantId: 1n,
          branchId: 10n,
          name: 'Karim Travels',
          phone: '+8801711000001',
          email: 'karim@agent.com',
          creditLimit: 500000n,
          currentBalance: 1000n,
          commissionRate: '5.50',
          statusId: 11n,
          status: { code: 'ACTIVE' },
          branch: { name: 'Dhaka Main' },
        },
      ]);

      const result = await service.getAgents(defaultQuery, '99', tenantUser);

      expect(mockDb.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 1n },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.data[0]).toEqual({
        id: 50,
        tenant_id: 1,
        branch_id: 10,
        branch_name: 'Dhaka Main',
        name: 'Karim Travels',
        phone: '+8801711000001',
        email: 'karim@agent.com',
        credit_limit: 500000,
        current_balance: 1000,
        commission_rate: 5.5,
        status_id: 11,
        status: 'ACTIVE',
      });
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, pages: 1 });
    });

    it('allows super admin to query all agents or filter by cookie', async () => {
      mockDb.agent.count.mockResolvedValue(0);
      mockDb.agent.findMany.mockResolvedValue([]);

      await service.getAgents(defaultQuery, undefined, superAdminUser);
      expect(mockDb.agent.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: {} }),
      );

      await service.getAgents(defaultQuery, '5', superAdminUser);
      expect(mockDb.agent.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { tenantId: 5n } }),
      );
    });

    it('applies branch_id, status and search filters', async () => {
      mockDb.agent.count.mockResolvedValue(0);
      mockDb.agent.findMany.mockResolvedValue([]);

      await service.getAgents(
        {
          ...defaultQuery,
          branch_id: 10,
          status: 'active',
          search: 'karim',
        },
        undefined,
        tenantUser,
      );

      expect(mockDb.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 1n,
            branchId: 10n,
            status: { code: 'ACTIVE' },
            OR: [
              { name: { contains: 'karim', mode: 'insensitive' } },
              { email: { contains: 'karim', mode: 'insensitive' } },
              { phone: { contains: 'karim', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });
});
