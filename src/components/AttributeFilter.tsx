'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/lib/i18n/navigation';
import { getStoredLanguage } from '@/lib/language';
import {
  parseCatalogAttrsParam,
  serializeCatalogAttrsParam,
} from '@/lib/catalog/catalog-attrs';
import { useProductsFilters, type AttributeFacetOption } from './ProductsFiltersProvider';
import { ShopFilterSectionHeader } from './shop/ShopFilterSectionHeader';
import { warmShopNavigationFromSearchParams } from '@/lib/navigation/storefront-prefetch';

type AttributeFilterProps = {
  attribute: AttributeFacetOption;
  selectedValues: string[];
};

export function AttributeFilter({ attribute, selectedValues }: AttributeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<string[]>(selectedValues);

  useEffect(() => {
    setSelected(selectedValues);
  }, [selectedValues]);

  const values = useMemo(
    () => attribute.values.filter((item) => item.count > 0),
    [attribute.values],
  );

  const applySelection = (nextForKey: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = parseCatalogAttrsParam(params.get('attrs') ?? undefined);
    if (nextForKey.length > 0) {
      current[attribute.key] = nextForKey;
    } else {
      delete current[attribute.key];
    }
    const serialized = serializeCatalogAttrsParam(current);
    if (serialized) {
      params.set('attrs', serialized);
    } else {
      params.delete('attrs');
    }
    params.delete('page');
    const href = warmShopNavigationFromSearchParams(router, params, getStoredLanguage());
    router.push(href);
  };

  const handleToggle = (value: string) => {
    const next = selected.some((item) => item.toLowerCase() === value.toLowerCase())
      ? selected.filter((item) => item.toLowerCase() !== value.toLowerCase())
      : [...selected, value];
    setSelected(next);
    applySelection(next);
  };

  const clear = () => {
    setSelected([]);
    applySelection([]);
  };

  if (values.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-[#E2E8F0] pb-6">
      <ShopFilterSectionHeader
        title={attribute.name}
        showClear={selected.length > 0}
        onClear={clear}
      />
      <div className="mt-4 space-y-3">
        {values.map((item) => {
          const isSelected = selected.some(
            (token) => token.toLowerCase() === item.value.toLowerCase(),
          );
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => handleToggle(item.value)}
              className="group -mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[#EFF6FF]"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                  isSelected
                    ? 'border-[#2CA1E2] bg-white'
                    : 'border-[#CAD5E2] bg-white group-hover:border-[#2CA1E2]'
                }`}
                aria-hidden
              >
                {isSelected ? (
                  <Check className="h-4 w-4 text-[#2CA1E2]" strokeWidth={2.5} aria-hidden />
                ) : null}
              </span>
              <span className="flex-1 truncate text-base leading-6 tracking-[-0.02em] text-[#314158] transition-colors group-hover:text-[#0F172B]">
                {item.label}
              </span>
              <span className="text-base leading-6 tracking-[-0.02em] text-[#90A1B9]">
                ({item.count})
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type AttributeFiltersListProps = {
  selectedAttrs: Record<string, string[]>;
};

export function AttributeFiltersList({ selectedAttrs }: AttributeFiltersListProps) {
  const filtersContext = useProductsFilters();
  const attributes = filtersContext?.data?.attributes ?? [];
  const loading = filtersContext?.loading ?? false;

  if (loading && attributes.length === 0) {
    return null;
  }

  return (
    <>
      {attributes.map((attribute) => (
        <AttributeFilter
          key={attribute.key}
          attribute={attribute}
          selectedValues={selectedAttrs[attribute.key] ?? []}
        />
      ))}
    </>
  );
}
