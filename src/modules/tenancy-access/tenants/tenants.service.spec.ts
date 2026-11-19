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

  beforeEach(() => {
    mockDb = {
      plan: {
        findUnique: vi.fn(),
      },
      tenant: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    service = new TenantsService(mockDb);
  });

  const validPayload = {
    plan_id: 1,
    name: 'SR Poribahon',
    domain: 'srporibahon.com',
  };

  it('throws UnauthorizedException when roleId is not provided', async () => {
    await expect(service.createTenant(validPayload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws ForbiddenException when roleId is not "1"', async () => {
    await expect(service.createTenant(validPayload, '2')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when plan does not exist', async () => {
    mockDb.plan.findUnique.mockResolvedValue(null);

    await expect(service.createTenant(validPayload, '1')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockDb.plan.findUnique).toHaveBeenCalledWith({
      where: { id: 1n },
    });
  });

  it('throws ConflictException when tenant name already exists', async () => {
    mockDb.plan.findUnique.mockResolvedValue({ id: 1n, name: 'Basic' });
    mockDb.tenant.findFirst.mockResolvedValue({
      id: 10n,
      name: 'SR Poribahon',
      domain: 'other.com',
    });

    await expect(service.createTenant(validPayload, '1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('creates and returns tenant successfully when inputs are valid', async () => {
    mockDb.plan.findUnique.mockResolvedValue({ id: 1n, name: 'Basic' });
    mockDb.tenant.findFirst.mockResolvedValue(null);
    mockDb.tenant.create.mockResolvedValue({
      id: 100n,
      planId: 1n,
      name: 'SR Poribahon',
      domain: 'srporibahon.com',
      status: 'APPLIED',
      paymentModel: 'TENANT_COLLECT',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.createTenant(validPayload, '1');

    expect(result).toEqual({
      id: '100',
      planId: '1',
      name: 'SR Poribahon',
    });
    expect(mockDb.tenant.create).toHaveBeenCalledWith({
      data: {
        planId: 1n,
        name: 'SR Poribahon',
        domain: 'srporibahon.com',
        status: 'APPLIED',
        paymentModel: 'TENANT_COLLECT',
      },
    });
  });
});
