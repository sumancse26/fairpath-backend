import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { TenantsService } from './tenants.service.js';
import { TenantsController } from './tenants.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [TenantsService],
  controllers: [TenantsController],
})
export class TenantsModule {}
