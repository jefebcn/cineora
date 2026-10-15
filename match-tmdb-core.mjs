/** Matching prudente: meglio saltare titoli ambigui che importarli errati. */
export function normalizedTitle(text) {return String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
export function scoreMatch(candidate,item) {
  const requested=normalizedTitle(candidate.title), name=normalizedTitle(item.title||item.name), original=normalizedTitle(item.original_title||item.original_name);
  if(!requested || (!name && !original))return 0;
  const exact=requested===name||requested===original;
  if(!exact)return 0; // Il matcher non indovina sulla base della popolarita'.
  const year=Number((item.release_date||item.first_air_date||'').slice(0,4));
  if(candidate.year && year && Math.abs(Number(candidate.year)-year)>1)return 0;
  return 100;
}
export function selectMatch(candidate,results) {
  const eligible=(results||[]).filter(item=>scoreMatch(candidate,item)===100);
  // Se piu' risultati esatti hanno ID diversi non selezionare arbitrariamente.
  if(eligible.length!==1)return null;
  return eligible[0];
}
