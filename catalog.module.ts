import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CatalogService } from './catalog.service';
import { SyncService } from './sync.service';
import { TmdbService } from './tmdb.service';

@Module({
  providers: [PrismaService, CatalogService, SyncService, TmdbService],
  exports: [PrismaService, CatalogService, SyncService, TmdbService],
})
export class CatalogModule {}
