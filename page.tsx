import type { Metadata } from 'next';
import { CatalogPage } from '../../components/CatalogPage';
export const metadata: Metadata = { title: 'Archivio' };
export default async function Archivio({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  return <CatalogPage heading="Archivio" description="Tutto il catalogo, un solo posto. Filtra e scopri ciò che ami." params={await searchParams}/>;
}
