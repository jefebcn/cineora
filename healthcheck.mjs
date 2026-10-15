const base = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
const check = async (path) => {
  const response = await fetch(`${base}${path}`, {signal:AbortSignal.timeout(5000)});
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};
try {
  const health = await check('/api/health');
  if (health.status !== 'ok' || health.database !== 'connected') throw new Error('Database non connesso');
  const home = await check('/api/home');
  for (const key of ['trending','recent','top10','movies','tv']) {
    if (!Array.isArray(home[key])) throw new Error(`Risposta /api/home non valida: ${key}`);
  }
  console.log('OK: API online e PostgreSQL collegato.');
  console.log('Elementi homepage:', Object.fromEntries(['trending','recent','top10','movies','tv'].map(k=>[k,home[k].length])));
  if (!home.recent.length) console.log('Catalogo vuoto: configura TMDB e accoda un job di sincronizzazione.');
} catch (error) {
  console.error('ERRORE verifica integrazione:', error instanceof Error ? error.message : String(error));
  process.exitCode=1;
}
