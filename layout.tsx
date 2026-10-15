import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../components/Header';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Cineora — Il tuo universo cinema', template: '%s | Cineora' }, description: 'Esplora film e serie TV: catalogo, trame, stagioni e informazioni sui titoli.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
 return <html lang="it"><body><Header/>{children}<footer className="footer"><div className="footer-inner"><Link href="/" className="footer-brand">CINEORA<span>.</span></Link><p>Un nuovo modo di esplorare film e serie. Nessuna riproduzione di contenuti video protetti.</p><div className="footer-line"/><p>Questo prodotto utilizza le API TMDB ma non è approvato né certificato da TMDB. <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">Fonte: The Movie Database</a>.</p><p className="legal-note">Prima di un lancio pubblico è necessario aggiungere un logo TMDB approvato e verificare termini, immagini e licenze applicabili.</p></div></footer></body></html>;
}
