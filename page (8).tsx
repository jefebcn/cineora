import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, CalendarDays, Star, Tv, Clapperboard, Clock3 } from 'lucide-react';
import { getSeasons, getTitle, tmdbImage, year } from '../../../lib/api';

export async function generateMetadata({ params }: { params: Promise<{id:string}> }): Promise<Metadata> {
 const title = await getTitle((await params).id); return { title: title?.name ?? 'Titolo non trovato' };
}
export default async function Dettaglio({ params }: { params: Promise<{id: string}> }) {
 const { id } = await params; const title = await getTitle(id);
 if (!title) return <main className="page-main"><h1>Titolo non trovato</h1><Link href="/archivio">Torna al catalogo</Link></main>;
 const seasons = title.type === 'tv' ? await getSeasons(id) : [];
 const backdrop = tmdbImage(title.backdropPath, 'original'); const poster = tmdbImage(title.posterPath, 'w500');
 return <main><section className="detail-hero" style={backdrop ? {backgroundImage: `linear-gradient(90deg,#090b12 0%,rgba(9,11,18,.78) 48%,rgba(9,11,18,.25) 95%),linear-gradient(0deg,#090b12,transparent 62%),url("${backdrop}")`} : undefined}>
  <div className="detail-body"><Link href="/archivio" className="back-link"><ArrowLeft size={17}/> Torna al catalogo</Link><div className="eyebrow"><span className="pulse"/> {title.type === 'movie' ? 'FILM' : 'SERIE TV'} <span className="eyebrow-line"/></div>
  <h1>{title.name}</h1><div className="detail-info"><span><CalendarDays size={17}/> {year(title.releaseDate)}</span><span>{title.type === 'movie' ? <Clapperboard size={17}/> : <Tv size={17}/>} {title.type === 'movie' ? 'Film' : 'Serie TV'}</span>{title.voteAverage > 0 && <span><Star size={17} fill="currentColor"/> {title.voteAverage.toFixed(1)} / 10</span>}</div>
  <p className="detail-overview">{title.overview || 'Trama non disponibile.'}</p><div className="detail-genres">{title.genres.map((g) => <span key={g.genre.id}>{g.genre.name}</span>)}</div>
  <div className="detail-note">Scheda informativa. La piattaforma non ospita né riproduce film o serie TV.</div>
  </div>{poster && <div className="detail-poster"><img src={poster} alt={`Poster di ${title.name}`}/></div>}</section>
  {title.type === 'tv' && <section className="seasons-wrap"><div className="section-heading"><div><h2>Stagioni ed episodi</h2><p>Guida degli episodi disponibili nel catalogo</p></div></div>{seasons.length ? seasons.map((s) => <div className="season" key={s.id}><h3>Stagione {s.seasonNumber} <span>{s.episodes.length} episodi</span></h3><div className="episodes">{s.episodes.map((ep) => <article key={ep.id}><span className="episode-number">{String(ep.episodeNumber).padStart(2,'0')}</span><div><h4>{ep.name}</h4><p>{ep.overview || 'Descrizione non disponibile'}</p><small>{ep.airDate && <span><CalendarDays size={12}/> {year(ep.airDate)}</span>}{ep.duration && <span><Clock3 size={12}/> {ep.duration} min</span>}</small></div></article>)}</div></div>) : <p className="empty-catalog">Episodi non ancora sincronizzati per questa serie.</p>}</section>}
 </main>;
}
