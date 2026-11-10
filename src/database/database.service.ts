import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn(
        '⚠️ DATABASE_URL is not set in environment variables. Database queries will fail.',
      );
    }
    const adapter = new PrismaPg({ connectionString: connectionString || '' });
    super({ adapter });
  }

  async onModuleInit() {
    try {
      if (process.env.DATABASE_URL) {
        await this.$connect();
        this.logger.log('Connected to database successfully.');
      }
    } catch (err) {
      this.logger.error('Failed to connect to database in onModuleInit:', err);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (err) {
      this.logger.error('Failed to disconnect from database:', err);
    }
  }
}
