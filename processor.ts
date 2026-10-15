import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SyncService } from './sync.service';

@Processor('catalog', { concurrency: 1, limiter: { max: 1, duration: 250 } })
export class CatalogProcessor extends WorkerHost {
  constructor(private readonly sync: SyncService) { super(); }
  async process(job: Job): Promise<number> {
    if (job.name !== 'trending' && job.name !== 'discover' && job.name !== 'seasons' && job.name !== 'refresh' && job.name !== 'new-releases' && job.name !== 'source-latest') throw new Error('Job sconosciuto');
    return this.sync.run(job.name);
  }
}
