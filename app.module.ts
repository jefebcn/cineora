import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { CatalogModule } from './catalog/catalog.module';
import { AdminController } from './catalog/admin.controller';
import { CatalogController } from './catalog/catalog.controller';
import { SchedulerService } from './catalog/scheduler.service';

const queueConnection = { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT || 6379) };
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), BullModule.forRoot({ connection: queueConnection }), BullModule.registerQueue({ name: 'catalog' }), CatalogModule],
  controllers: [CatalogController, AdminController],
  providers: [SchedulerService],
})
export class AppModule {}
