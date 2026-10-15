/** Richiede TMDB_READ_ACCESS_TOKEN. Conserva solo i match esatti e non ambigui. */
import { readFile, writeFile } from 'node:fs/promises';
import { selectMatch } from './match-tmdb-core.mjs';
const input=process.argv[2]||'data/observed-on-reference-2026-10-15.json';
const output=process.argv[3]||'data/source-latest-enriched.json';
const token=process.env.TMDB_READ_ACCESS_TOKEN;
if(!token || token.startsWith('YOUR_')){console.error('Imposta TMDB_READ_ACCESS_TOKEN sul server (non nel frontend).');process.exit(1);}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const raw=JSON.parse(await readFile(input,'utf8'));
 if(!Array.isArray(raw.items)||!['latest-page-observed','verified-present-not-verified-latest'].includes(raw.datasetType))throw Error('Feed di origine non valido');
 const accepted=[],rejected=[];
 for(const item of raw.items.slice(0,160)){
  if(!['tv','movie'].includes(item.type)||!/^https:\/\/streamingcommunityz\.shiksha\/it\/titles\/\d+-/.test(item.sourceUrl)) {rejected.push({...item,reason:'bad-source'});continue;}
  const url=new URL(`https://api.themoviedb.org/3/search/${item.type}`);
  url.searchParams.set('query',item.title);url.searchParams.set('language','it-IT');url.searchParams.set('include_adult','false');
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error(`TMDB HTTP ${response.status}: riprovare in seguito`);
  const found=selectMatch(item,(await response.json()).results);
  if(found)accepted.push({...item,tmdbId:found.id,matchStatus:'accepted',sourceObservedAt:raw.observedAt});
  else rejected.push({...item,reason:'not-found-or-ambiguous'});
  await wait(280);
 }
 const feed={source:raw.source,sourceDatasetType:raw.datasetType, matchedAt:new Date().toISOString(),items:accepted};
 await writeFile(output,JSON.stringify(feed,null,2)+'\n');
 await writeFile(output.replace(/\.json$/,'-unmatched.json'),JSON.stringify({items:rejected},null,2)+'\n');
 console.log(`TMDB: ${accepted.length} match sicuri, ${rejected.length} esclusi. Feed: ${output}`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
