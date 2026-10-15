import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { CatalogModule } from './catalog/catalog.module';
import { CatalogProcessor } from './catalog/processor';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), BullModule.forRoot({ connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT || 6379) } }), BullModule.registerQueue({ name: 'catalog' }), CatalogModule],
  providers: [CatalogProcessor],
})
export class WorkerModule {}
