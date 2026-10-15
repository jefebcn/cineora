import Link from 'next/link';
import { ArrowUpRight, Star, Clapperboard, Tv, ArrowRight } from 'lucide-react';
import type { Title } from '../lib/api';
import { tmdbImage, year } from '../lib/api';

export function TitleCard({ title, index }: { title: Title; index?: number }) {
  const image = tmdbImage(title.posterPath);
  return <Link className="title-card" href={`/titolo/${title.id}`} aria-label={`Dettagli di ${title.name}`}>
    <div className="poster">
      {image ? <img src={image} alt={`Locandina di ${title.name}`} loading="lazy"/> : <div className="poster-placeholder"><Clapperboard size={48} strokeWidth={1.3}/><strong>{title.name}</strong></div>}
      {index !== undefined && <span className="rank-badge">{String(index + 1).padStart(2, '0')}</span>}
      <span className="poster-overlay"><ArrowUpRight size={21}/></span>
    </div>
    <div className="card-title">{title.name}</div>
    <div className="card-meta"><span>{year(title.releaseDate)} · {title.type === 'movie' ? 'Film' : 'Serie TV'}</span>{title.voteAverage > 0 && <span className="rating"><Star size={12} fill="currentColor"/> {title.voteAverage.toFixed(1)}</span>}</div>
  </Link>;
}

export function Shelf({ title, subtitle, items, href, ranked = false }: { title: string; subtitle?: string; items: Title[]; href: string; ranked?: boolean }) {
  return <section className="shelf"><div className="section-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><Link href={href} className="browse-all">Sfoglia tutti <ArrowRight size={17}/></Link></div>
    {items.length ? <div className="card-row">{items.map((item, i) => <TitleCard key={item.id} title={item} index={ranked ? i : undefined}/>)}</div> : <div className="empty-shelf"><span className="empty-icon"><Tv size={21}/></span>Ancora nessun titolo: avvia la sincronizzazione TMDB.</div>}
  </section>;
}
export function Grid({ items }: { items: Title[] }) { return items.length ? <div className="catalog-grid">{items.map((title) => <TitleCard key={title.id} title={title}/>)}</div> : <div className="empty-catalog">Nessun titolo disponibile con questi filtri. Verifica la sincronizzazione o modifica la ricerca.</div>; }
