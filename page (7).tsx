import type { Metadata } from 'next';
import { CatalogPage } from '../../components/CatalogPage';
export const metadata: Metadata = { title: 'Serie TV' };
export default async function SerieTV({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  return <CatalogPage heading="Serie TV" description="Stagione dopo stagione, trova una nuova storia in cui immergerti." type="tv" params={await searchParams}/>;
}
