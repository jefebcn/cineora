import type { Metadata } from 'next';
import { CatalogPage } from '../../components/CatalogPage';
export const metadata: Metadata = { title: 'Film' };
export default async function Film({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  return <CatalogPage heading="Film" description="Cinema senza confini. Scopri film di ogni genere, epoca e atmosfera." type="movie" params={await searchParams}/>;
}
