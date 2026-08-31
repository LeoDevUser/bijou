import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import ProductCard from '../components/ui/ProductCard';
import type { ItemView, LabelView, CategoryView, CollectionView } from '../types';
import { pickLocale } from '../types';

type SortOption = 'default' | 'bestselling' | 'price_asc' | 'price_desc';

const effectivePrice = (item: ItemView) =>
  item.discountPercent ? item.price * (1 - item.discountPercent / 100) : item.price;

type FlatCollection = { c: CollectionView; depth: number };

/** Depth-first flatten of the collection tree — each parent immediately before its children. */
function flattenCollections(roots: CollectionView[], depth = 0): FlatCollection[] {
  return roots.flatMap(c => [{ c, depth }, ...flattenCollections(c.children ?? [], depth + 1)]);
}

/** A collection together with every subcollection beneath it. */
function branchOf(c: CollectionView): CollectionView[] {
  return [c, ...(c.children ?? []).flatMap(branchOf)];
}

export default function Shop() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allItems, setAllItems] = useState<ItemView[]>([]);
  const [labels, setLabels] = useState<LabelView[]>([]);
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [collections, setCollections] = useState<CollectionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('default');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeCategories = useMemo(() => searchParams.getAll('category'), [searchParams]);
  const activeLabelValues = useMemo(() => searchParams.getAll('label'), [searchParams]);
  const activeCollections = useMemo(() => searchParams.getAll('collection'), [searchParams]);

  useEffect(() => {
    api.labels.list().then(setLabels).catch(console.error);
    api.categories.list().then(setCategories).catch(console.error);
    api.collections.list().then(setCollections).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetch = sort === 'bestselling' ? api.items.bestselling() : api.items.list();
    fetch
      .then(setAllItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sort === 'bestselling']); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve each selected label value (numeric id or a name slug) to a label id.
  const resolvedLabelIds = useMemo(() => {
    const ids = activeLabelValues.map(value => {
      const numeric = Number(value);
      if (!isNaN(numeric) && value !== '') return numeric;
      const slug = value.toLowerCase();
      const match = labels.find(l =>
        (l.nameEn ?? '').toLowerCase() === slug ||
        (l.nameFr ?? '').toLowerCase() === slug ||
        (l.nameEs ?? '').toLowerCase() === slug
      );
      return match ? match.id : null;
    }).filter((id): id is number => id !== null);
    return Array.from(new Set(ids));
  }, [activeLabelValues, labels]);

  const flatCollections = useMemo(() => flattenCollections(collections), [collections]);

  /**
   * A collection holds the items sharing a label or category with it or with any of its
   * subcollections — the same roll-up /public/collections/{id}/items does server-side, so
   * picking a parent here matches everything its children hold. Selected ids that resolve
   * to no active collection contribute nothing, exactly as an unknown category id does.
   */
  const collectionFilter = useMemo(() => {
    if (activeCollections.length === 0) return null;
    const byId = new Map(flatCollections.map(({ c }) => [String(c.id), c]));
    const labelIds = new Set<number>();
    const categoryIds = new Set<number>();
    activeCollections.forEach(value => {
      const selected = byId.get(value);
      if (!selected) return;
      branchOf(selected).forEach(c => {
        c.labels.forEach(l => labelIds.add(l.id));
        c.categories.forEach(cat => categoryIds.add(cat.id));
      });
    });
    return { labelIds, categoryIds };
  }, [activeCollections, flatCollections]);

  const items = useMemo(() => {
    let result = allItems;
    if (activeCategories.length > 0) {
      result = result.filter(item => item.categories.some(c => activeCategories.includes(String(c.id))));
    }
    if (resolvedLabelIds.length > 0) {
      result = result.filter(item => item.labels.some(l => resolvedLabelIds.includes(l.id)));
    }
    if (collectionFilter) {
      result = result.filter(item =>
        item.labels.some(l => collectionFilter.labelIds.has(l.id)) ||
        item.categories.some(c => collectionFilter.categoryIds.has(c.id)));
    }
    if (sort === 'price_asc') result = [...result].sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sort === 'price_desc') result = [...result].sort((a, b) => effectivePrice(b) - effectivePrice(a));
    return result;
  }, [allItems, activeCategories, resolvedLabelIds, collectionFilter, sort]);

  // Each filter group is a repeated query param, so the current selection is shareable
  // and CTAs elsewhere can deep-link straight into it.
  function toggleParam(key: string, value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const current = next.getAll(key);
      next.delete(key);
      (current.includes(value) ? current.filter(v => v !== value) : [...current, value])
        .forEach(v => next.append(key, v));
      return next;
    }, { replace: true });
  }

  function clearParam(key: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      return next;
    }, { replace: true });
  }

  function clearAll() {
    setSearchParams({}, { replace: true });
  }

  const hasFilters = activeCategories.length > 0 || resolvedLabelIds.length > 0 || activeCollections.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-1">{t('shop.title')}</h1>
      <p className="text-muted text-sm mb-8">{items.length} {t('shop.items')}</p>

      {/* Filters — collapsed by default behind a search/filter toggle */}
      <div className="mb-10">
        <button
          onClick={() => setFiltersOpen(o => !o)}
          aria-expanded={filtersOpen}
          className="flex items-center gap-2 text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-dark transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          {t('shop.filter')}
          {hasFilters && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 text-[0.65rem] bg-dark text-white rounded-full leading-none">
              {activeCategories.length + resolvedLabelIds.length + activeCollections.length}
            </span>
          )}
        </button>
      </div>

      {filtersOpen && (
      <div className="mb-10 space-y-3">
        {/* Category pills */}
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest text-muted">{t('shop.category')}</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => clearParam('category')}
              className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${activeCategories.length === 0 ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
            >
              {t('shop.all')}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => toggleParam('category', String(cat.id))}
                className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${activeCategories.includes(String(cat.id)) ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
              >
                {pickLocale(cat.nameEn, cat.nameFr, cat.nameEs, i18n.language)}
              </button>
            ))}
          </div>
        </div>

        {/* Label pills — only shown when labels exist */}
        {labels.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-muted">{t('shop.label')}</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => clearParam('label')}
                className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${resolvedLabelIds.length === 0 ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
              >
                {t('shop.all')}
              </button>
              {labels.map(label => (
                <button
                  key={label.id}
                  onClick={() => toggleParam('label', String(label.id))}
                  className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${resolvedLabelIds.includes(label.id) ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
                >
                  {pickLocale(label.nameEn, label.nameFr, label.nameEs, i18n.language)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collection pills — subcollections follow their parent, marked with a chevron */}
        {flatCollections.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-muted">{t('shop.collection')}</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => clearParam('collection')}
                className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${activeCollections.length === 0 ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
              >
                {t('shop.all')}
              </button>
              {flatCollections.map(({ c, depth }) => (
                <button
                  key={c.id}
                  onClick={() => toggleParam('collection', String(c.id))}
                  className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${activeCollections.includes(String(c.id)) ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
                >
                  {depth > 0 && <span className="opacity-60 mr-1" aria-hidden="true">↳</span>}
                  {pickLocale(c.headerEn, c.headerFr, c.headerEs, i18n.language)
                    || (c.labels[0] && pickLocale(c.labels[0].nameEn, c.labels[0].nameFr, c.labels[0].nameEs, i18n.language))}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sort */}
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest text-muted">{t('shop.sort')}</span>
          <div className="flex flex-wrap gap-2">
            {([
              ['default',     t('shop.sortDefault')],
              ['bestselling', t('shop.sortBestselling')],
              ['price_asc',   t('shop.sortPriceAsc')],
              ['price_desc',  t('shop.sortPriceDesc')],
            ] as [SortOption, string][]).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setSort(value)}
                className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${sort === value ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear all */}
        {hasFilters && (
          <button onClick={clearAll} className="text-xs uppercase tracking-widest text-muted hover:text-dark transition-colors border-b border-muted pb-0.5">
            {t('shop.clearFilters')}
          </button>
        )}
      </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-[#F0EDE8] aspect-square mb-3" />
              <div className="h-3.5 bg-[#F0EDE8] w-3/4 mb-2 rounded" />
              <div className="h-3.5 bg-[#F0EDE8] w-1/4 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted text-center py-24">{t('shop.noProducts')}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map(item => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
