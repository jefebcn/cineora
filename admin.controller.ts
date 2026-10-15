import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { timingSafeEqual } from 'node:crypto';
import { CatalogService } from './catalog.service';

@Controller('api/admin')
export class AdminController {
  constructor(@InjectQueue('catalog') private readonly queue: Queue, private readonly catalog: CatalogService) {}
  private authorize(received: string) {
    const secret = process.env.ADMIN_SYNC_KEY;
    if (!secret || secret.length < 24) throw new HttpException('Chiave amministratore non configurata', HttpStatus.SERVICE_UNAVAILABLE);
    const a = Buffer.from(received || ''), b = Buffer.from(secret);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpException('Accesso negato', HttpStatus.UNAUTHORIZED);
  }
  @Post('sync') async sync(@Headers('x-admin-key') key: string, @Body() body: { kind?: string }) {
    this.authorize(key);
    const kind = body?.kind;
    if (kind !== 'trending' && kind !== 'discover' && kind !== 'seasons' && kind !== 'refresh' && kind !== 'new-releases' && kind !== 'source-latest') {
      throw new HttpException('kind ammesso: trending, discover, seasons, refresh, new-releases, source-latest', HttpStatus.BAD_REQUEST);
    }
    const job = await this.queue.add(kind, {}, { attempts: 3, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: 100, removeOnFail: 100 });
    return { queued: true, jobId: job.id, kind };
  }
  @Get('sync') history(@Headers('x-admin-key') key: string) {
    this.authorize(key); return this.catalog.syncHistory();
  }
}
