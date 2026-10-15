import type { Metadata } from 'next';
import { Search as SearchIcon } from 'lucide-react';
import { searchTitles } from '../../lib/api';
import { Grid } from '../../components/Cards';
export const metadata: Metadata = { title: 'Cerca' };
export default async function Cerca({ searchParams }: { searchParams: Promise<{q?: string}> }) {
  const term = (await searchParams).q?.slice(0,100).trim() || '';
  const result = term.length > 1 ? await searchTitles(term) : { items: [] };
  return <main className="page-main"><div className="page-intro"><div className="eyebrow"><span className="pulse"/> SCOPRI UNA NUOVA STORIA</div><h1>Cerca<span>.</span></h1><p>Un titolo, un genere, un ricordo. Tutto parte da qui.</p></div>
    <form className="big-search" action="/cerca" method="get"><SearchIcon size={23}/><input name="q" type="search" required minLength={2} defaultValue={term} placeholder="Quale film o serie stai cercando?" aria-label="Cerca nel catalogo"/><button>Cerca</button></form>
    <div className="results-count">{term.length > 1 ? `${result.items.length} RISULTATI PER “${term}”` : 'INSERISCI ALMENO 2 CARATTERI'}</div>
    {term.length > 1 && <Grid items={result.items}/>}</main>;
}
