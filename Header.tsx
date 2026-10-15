import Link from 'next/link';
import { Clapperboard, Search, Film, Tv, Grid2X2 } from 'lucide-react';
export function Header() {
  return <header className="site-header"><div className="header-inner">
    <Link href="/" className="brand" aria-label="Cineora, home"><span className="brand-mark"><Clapperboard size={19} strokeWidth={2.7}/></span>CINE<span>ORA</span><i className="brand-dot"/></Link>
    <nav className="nav-links" aria-label="Navigazione principale">
      <Link href="/">Home</Link><Link href="/film"><Film size={16}/> Film</Link><Link href="/serie-tv"><Tv size={16}/> Serie TV</Link><Link href="/archivio"><Grid2X2 size={16}/> Archivio</Link>
    </nav>
    <form action="/cerca" method="get" className="header-search" role="search"><Search size={17}/><input aria-label="Cerca film e serie" name="q" type="search" minLength={2} placeholder="Cerca un film o una serie..."/><kbd>↵</kbd></form>
    <Link href="/cerca" className="mobile-search" aria-label="Cerca"><Search size={22}/></Link>
  </div></header>;
}
