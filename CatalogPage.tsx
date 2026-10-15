import Link from 'next/link';
import { Filter, ArrowLeft, ArrowRight } from 'lucide-react';
import { getCatalog, getGenres } from '../lib/api';
import { Grid } from './Cards';
export async function CatalogPage({ heading, description, type, params }: { heading: string; description: string; type?: 'movie'|'tv'; params: Record<string, string|undefined> }) {
  const q = { ...params, ...(type ? { type } : {}) };
  const [result, genres] = await Promise.all([getCatalog(q), getGenres()]);
  const page = result.page;
  const build = (p: number) => { const sp = new URLSearchParams(); for (const [k, v] of Object.entries(params)) if (v && k !== 'page') sp.set(k, v); sp.set('page', String(p)); return `?${sp.toString()}`; };
  return <main className="page-main"><div className="page-intro"><div className="eyebrow"><span className="pulse"/> LA TUA PROSSIMA STORIA</div><h1>{heading}<span>.</span></h1><p>{description}</p></div>
    <form method="get" className="filter-bar"><div className="filters-label"><Filter size={18}/> Filtra per</div>
      <select name="genre" defaultValue={params.genre || ''} aria-label="Genere"><option value="">Tutti i generi</option>{genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
      <select name="year" defaultValue={params.year || ''} aria-label="Anno"><option value="">Qualsiasi anno</option>{Array.from({length: 45}, (_,i) => new Date().getUTCFullYear()-i).map((y) => <option key={y} value={y}>{y}</option>)}</select>
      <select name="sort" defaultValue={params.sort || 'popular'} aria-label="Ordina"><option value="popular">Più popolari</option><option value="rating">Voto migliore</option><option value="recent">Uscita più recente</option><option value="added">Aggiunti al catalogo</option></select>
      <button type="submit" className="filter-button">Applica filtri <ArrowRight size={16}/></button></form>
    <div className="results-count">{result.total} TITOLI DISPONIBILI</div><Grid items={result.items}/>
    <div className="pagination">{page > 1 && <Link href={build(page-1)}><ArrowLeft size={17}/> Precedente</Link>}<span>Pagina {page} di {Math.max(result.pages,1)}</span>{page < result.pages && <Link href={build(page+1)}>Successiva <ArrowRight size={17}/></Link>}</div>
  </main>;
}
