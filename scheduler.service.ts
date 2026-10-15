import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly log = new Logger(SchedulerService.name);
  constructor(@InjectQueue('catalog') private readonly queue: Queue) {}
  async onModuleInit() {
    if (process.env.ENABLE_SCHEDULER !== '1' || !process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN.startsWith('YOUR_')) {
      this.log.warn('Scheduler disattivato: impostare ENABLE_SCHEDULER=1 e TMDB_READ_ACCESS_TOKEN');
      return;
    }
    for (const [kind, pattern] of [['trending', '0 */6 * * *'], ['discover', '0 */12 * * *'], ['seasons', '0 2 * * *'], ['refresh', '0 3 * * *'], ['new-releases', '0 */12 * * *']] as const) {
      await this.queue.upsertJobScheduler(`catalog-${kind}`, { pattern, tz: 'Europe/Rome' }, {
        name: kind, data: {}, opts: { attempts: 3, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: 100, removeOnFail: 100 },
      });
    }
    await this.queue.add('trending', {}, { jobId: 'bootstrap-trending', removeOnComplete: true });
    await this.queue.add('discover', {}, { jobId: 'bootstrap-discover', removeOnComplete: true });
    await this.queue.add('seasons', {}, { jobId: 'bootstrap-seasons', removeOnComplete: true });
    await this.queue.add('refresh', {}, { jobId: 'bootstrap-refresh', removeOnComplete: true });
    await this.queue.add('new-releases', {}, { jobId: 'bootstrap-new-releases', removeOnComplete: true });
    this.log.log('Job iniziali e pianificazioni catalogo creati');
  }
}
