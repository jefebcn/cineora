import 'dotenv/config';
import { Queue } from 'bullmq';

async function main() {
  const kind = process.argv[2] || 'trending';
  if (!['trending', 'discover', 'seasons', 'refresh', 'new-releases', 'source-latest'].includes(kind)) throw new Error('kind: trending|discover|seasons|refresh|new-releases|source-latest');
  const queue = new Queue('catalog', { connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: Number(process.env.REDIS_PORT || 6379) } });
  try {
    const job = await queue.add(kind, {}, { attempts: 3, backoff: { type: 'exponential', delay: 3000 } });
    console.log(`Job ${kind} accodato: ${job.id}`);
  } finally { await queue.close(); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
