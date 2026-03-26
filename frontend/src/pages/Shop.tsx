import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import ProductCard from '../components/ui/ProductCard';
import type { ItemView } from '../types';

export default function Shop() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');

  useEffect(() => {
    setLoading(true);
    const fetch = category ? api.items.byCategory(category) : api.items.list();
    fetch
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-1">{t('shop.title')}</h1>
      <p className="text-muted text-sm mb-10">{items.length} {t('shop.items')}</p>

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
