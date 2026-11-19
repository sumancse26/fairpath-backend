import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { CreateTenantType } from '../dto/tenant.dto.js';
import { DatabaseService } from '../../../database/database.service.js';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly db: DatabaseService) {}

  async createTenant(payload: CreateTenantType, roleId?: string) {
    if (!roleId) {
      throw new UnauthorizedException('Authentication required');
    }

    if (roleId !== '1') {
      throw new ForbiddenException(
        'You do not have permission to create a tenant',
      );
    }

    const plan = await this.db.plan.findUnique({
      where: { id: BigInt(payload.plan_id) },
    });

    if (!plan) {
      throw new NotFoundException(
        `Subscription plan with ID ${payload.plan_id} not found`,
      );
    }

    const trimmedName = payload.name.trim();
    const trimmedDomain = payload.domain?.trim() || null;

    const existing = await this.db.tenant.findFirst({
      where: {
        OR: [
          { name: { equals: trimmedName, mode: 'insensitive' as const } },
          ...(trimmedDomain
            ? [
                {
                  domain: {
                    equals: trimmedDomain,
                    mode: 'insensitive' as const,
                  },
                },
              ]
            : []),
        ],
      },
    });

    if (existing) {
      const isNameConflict =
        existing.name.toLowerCase() === trimmedName.toLowerCase();
      throw new ConflictException(
        isNameConflict
          ? `Tenant with name "${trimmedName}" already exists`
          : `Tenant with domain "${trimmedDomain}" already exists`,
      );
    }

    try {
      const tenant = await this.db.tenant.create({
        data: {
          planId: BigInt(payload.plan_id),
          name: trimmedName,
          domain: trimmedDomain,
          status: 'APPLIED',
          paymentModel: 'TENANT_COLLECT',
        },
      });

      return {
        id: tenant.id.toString(),
        planId: tenant.planId.toString(),
        name: tenant.name,
      };
    } catch (error) {
      this.logger.error('Failed to create tenant in database:', error);
      throw new InternalServerErrorException(
        'An error occurred while creating the tenant',
      );
    }
  }
}
