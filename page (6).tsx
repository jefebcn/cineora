import Link from 'next/link';
import { ArrowRight, Play, Sparkles, Compass, Clapperboard, Zap, Film } from 'lucide-react';
import { getHome, tmdbImage, year } from '../lib/api';
import { Shelf } from '../components/Cards';

export default async function Home() {
 const home = await getHome(); const featured = home.featured;
 const backdrop = featured ? tmdbImage(featured.backdropPath, 'original') : undefined;
 return <main><section className="hero" style={backdrop ? {backgroundImage: `linear-gradient(90deg,#090b12 6%,rgba(9,11,18,.9) 32%,rgba(9,11,18,.3) 85%), linear-gradient(0deg,#090b12 0%, transparent 54%),url("${backdrop}")`} : undefined}>
   <div className="hero-content"><div className="eyebrow"><span className="pulse"/> IL TUO UNIVERSO CINEMA <span className="eyebrow-line"/></div>
   <div className="hero-copy"><h1>{featured ? featured.name : <>Ogni storia<br/>inizia <em>qui.</em></>}</h1><p>{featured ? (featured.overview || 'Scopri il titolo, la trama e gli episodi.') : 'Un catalogo di film e serie TV da esplorare. Le tue prossime storie preferite sono a un clic di distanza.'}</p></div>
   <div className="hero-meta">{featured ? <><span><Sparkles size={15}/> In evidenza</span><span>{year(featured.releaseDate)}</span><span>{featured.type === 'movie' ? 'Film' : 'Serie TV'}</span></> : <><span><Compass size={15}/> Scopri nuovi mondi</span><span>Aggiornato automaticamente</span></>}</div>
   <div className="hero-actions"><Link className="btn-primary" href={featured ? `/titolo/${featured.id}` : '/archivio'}><Play size={18} fill="currentColor"/> {featured ? 'Scopri il titolo' : 'Esplora il catalogo'}</Link><Link className="btn-secondary" href="/archivio">Sfoglia tutto <ArrowRight size={18}/></Link></div>
   </div><div className="hero-scroll">SCOPRI DI PIÙ <span className="hero-scroll-line"/></div>
 </section>
 <div className="content-wrap"><div className="quick-categories"><Link href="/film"><span className="category-icon"><Clapperboard size={20}/></span><div><strong>Film</strong><small>Da scoprire</small></div><ArrowRight size={18}/></Link><Link href="/serie-tv"><span className="category-icon purple"><Film size={20}/></span><div><strong>Serie TV</strong><small>Stagioni ed episodi</small></div><ArrowRight size={18}/></Link><Link href="/archivio"><span className="category-icon sky"><Zap size={20}/></span><div><strong>Archivio</strong><small>Trova la tua storia</small></div><ArrowRight size={18}/></Link></div>
 <Shelf title="I titoli del momento" subtitle="Le storie più seguite della settimana" items={home.trending} href="/archivio"/>
 <Shelf title="Aggiunti di recente" subtitle="Le novità del nostro catalogo" items={home.recent} href="/archivio?sort=added"/>
 {home.observed?.length ? <Shelf title="Individuati su fonti pubbliche" subtitle="Titoli verificati, non necessariamente ultimi aggiunti" items={home.observed} href="/archivio"/> : null}
 <Shelf title="Top 10 del catalogo" subtitle="Titoli con più voti registrati" items={home.top10} href="/archivio?sort=rating" ranked/>
 <Shelf title="Film da scoprire" items={home.movies} href="/film"/>
 <Shelf title="Serie TV" items={home.tv} href="/serie-tv"/>
 </div></main>;
}
