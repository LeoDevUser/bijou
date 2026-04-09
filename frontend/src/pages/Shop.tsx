import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import ProductCard from '../components/ui/ProductCard';
import type { ItemView, LabelView, CategoryView } from '../types';
import { pickLocale } from '../types';

type SortOption = 'default' | 'bestselling' | 'price_asc' | 'price_desc';

const effectivePrice = (item: ItemView) =>
  item.discountPercent ? item.price * (1 - item.discountPercent / 100) : item.price;

export default function Shop() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allItems, setAllItems] = useState<ItemView[]>([]);
  const [labels, setLabels] = useState<LabelView[]>([]);
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('default');

  const activeCategory = searchParams.get('category') ?? '';
  const activeLabelId = searchParams.get('label') ?? '';

  useEffect(() => {
    api.labels.list().then(setLabels).catch(console.error);
    api.categories.list().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetch = sort === 'bestselling' ? api.items.bestselling() : api.items.list();
    fetch
      .then(setAllItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sort === 'bestselling']); // eslint-disable-line react-hooks/exhaustive-deps

  const resolvedLabelId = useMemo(() => {
    if (!activeLabelId) return null;
    const numeric = Number(activeLabelId);
    if (!isNaN(numeric)) return numeric;
    // Slug resolution: match by name (case-insensitive)
    const slug = activeLabelId.toLowerCase();
    const match = labels.find(l =>
      (l.nameEn ?? '').toLowerCase() === slug ||
      (l.nameFr ?? '').toLowerCase() === slug ||
      (l.nameEs ?? '').toLowerCase() === slug
    );
    return match ? match.id : null;
  }, [activeLabelId, labels]);

  const items = useMemo(() => {
    let result = allItems;
    if (activeCategory) {
      result = result.filter(item => String(item.category.id) === activeCategory);
    }
    if (resolvedLabelId !== null) {
      result = result.filter(item => item.labels.some(l => l.id === resolvedLabelId));
    }
    if (sort === 'price_asc') result = [...result].sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sort === 'price_desc') result = [...result].sort((a, b) => effectivePrice(b) - effectivePrice(a));
    return result;
  }, [allItems, activeCategory, resolvedLabelId, sort]);

  function setCategory(value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set('category', value); else next.delete('category');
      return next;
    }, { replace: true });
  }

  function setLabel(value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set('label', value); else next.delete('label');
      return next;
    }, { replace: true });
  }

  function clearAll() {
    setSearchParams({}, { replace: true });
  }

  const hasFilters = activeCategory || resolvedLabelId !== null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-1">{t('shop.title')}</h1>
      <p className="text-muted text-sm mb-8">{items.length} {t('shop.items')}</p>

      {/* Filters */}
      <div className="mb-10 space-y-3">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-widest text-muted w-16 shrink-0">{t('shop.category')}</span>
          <button
            onClick={() => setCategory('')}
            className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${!activeCategory ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
          >
            {t('shop.all')}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(activeCategory === String(cat.id) ? '' : String(cat.id))}
              className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${activeCategory === String(cat.id) ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
            >
              {pickLocale(cat.nameEn, cat.nameFr, cat.nameEs, i18n.language)}
            </button>
          ))}
        </div>

        {/* Label pills — only shown when labels exist */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs uppercase tracking-widest text-muted w-16 shrink-0">{t('shop.label')}</span>
            <button
              onClick={() => setLabel('')}
              className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${resolvedLabelId === null ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
            >
              {t('shop.all')}
            </button>
            {labels.map(label => (
              <button
                key={label.id}
                onClick={() => setLabel(resolvedLabelId === label.id ? '' : String(label.id))}
                className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${resolvedLabelId === label.id ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
              >
                {pickLocale(label.nameEn, label.nameFr, label.nameEs, i18n.language)}
              </button>
            ))}
          </div>
        )}

        {/* Sort */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-widest text-muted w-16 shrink-0">{t('shop.sort')}</span>
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

        {/* Clear all */}
        {hasFilters && (
          <button onClick={clearAll} className="text-xs uppercase tracking-widest text-muted hover:text-dark transition-colors border-b border-muted pb-0.5">
            {t('shop.clearFilters')}
          </button>
        )}
      </div>

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
