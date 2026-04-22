import { redirect } from 'next/navigation';

type SearchValue = string | string[] | undefined;

interface ProductsRedirectPageProps {
  searchParams?: Promise<Record<string, SearchValue>> | Record<string, SearchValue>;
}

export default async function ProductsRedirectPage({ searchParams }: ProductsRedirectPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const query = new URLSearchParams();

  Object.entries(resolvedParams).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length > 0) {
      query.set(key, value);
      return;
    }

    if (Array.isArray(value)) {
      value
        .filter((item) => typeof item === 'string' && item.length > 0)
        .forEach((item) => query.append(key, item));
    }
  });

  const queryString = query.toString();
  redirect(queryString ? `/shop?${queryString}` : '/shop');
}
