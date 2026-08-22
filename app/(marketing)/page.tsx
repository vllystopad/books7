import { CatalogueView } from "@/src/features/books/CatalogueView";
import { shouldHideSynthetic } from "@/src/features/books/SyntheticFilter";
import { getLibrary } from "@/src/features/books/queries";

/** Server component: fetches on the server, renders the client view. */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const hideSynthetic = shouldHideSynthetic(await searchParams);
  const books = await getLibrary();

  return <CatalogueView books={books} hideSynthetic={hideSynthetic} />;
}
