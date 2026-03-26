import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import ProductCard from '../components/ui/ProductCard';
import type { ItemView } from '../types';

const CATEGORIES = [
  { key: 'home.categories.rings', value: 'RINGS' },
  { key: 'home.categories.necklaces', value: 'NECKLACES' },
  { key: 'home.categories.earrings', value: 'EARRINGS' },
  { key: 'home.categories.bracelets', value: 'BRACELETS' },
  { key: 'home.categories.anklets', value: 'ANKLETS' },
] as const;

export default function Home() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ItemView[]>([]);

  useEffect(() => {
    api.items.list().then(setItems).catch(console.error);
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative w-full h-[85vh] bg-[#D8D4CC] flex items-end overflow-hidden">
        {/* Placeholder — replace inner div with <img> when ready */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted text-sm uppercase tracking-widest">{t('home.hero.imagePlaceholder')}</p>
        </div>
        {/* Text overlay — bottom left */}
        <div className="relative z-10 p-10 md:p-16 max-w-lg">
          <h1 className="font-serif text-5xl md:text-6xl italic font-light text-dark leading-tight mb-6">
            {t('home.hero.tagline')}
          </h1>
          <Link
            to="/shop"
            className="inline-block border border-dark text-dark px-10 py-3 text-xs uppercase tracking-widest hover:bg-dark hover:text-white transition-colors"
          >
            {t('home.hero.cta')}
          </Link>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="font-serif text-3xl font-light text-center mb-10">
          {t('home.categories.title')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {CATEGORIES.map(cat => (
            <Link key={cat.key} to={`/shop?category=${cat.value}`} className="group block">
              <div className="bg-[#F0EDE8] aspect-square mb-3 flex items-center justify-center group-hover:bg-[#E8E4DC] transition-colors">
                <span className="text-muted text-xs uppercase tracking-widest">{t(cat.key)}</span>
              </div>
              <p className="text-center text-xs uppercase tracking-widest">{t(cat.key)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Now */}
      {items.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-serif text-3xl font-light">{t('home.trending.title')}</h2>
            <Link
              to="/shop"
              className="text-xs uppercase tracking-widest border-b border-dark pb-0.5 hover:text-gold hover:border-gold transition-colors"
            >
              {t('home.trending.viewAll')}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {items.slice(0, 8).map(item => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Editorial 1 */}
      <section className="grid md:grid-cols-2">
        <div className="bg-[#E0DDD8] min-h-[440px] flex items-center justify-center">
          <p className="text-muted text-xs uppercase tracking-widest">{t('home.hero.imagePlaceholder')}</p>
        </div>
        <div className="bg-[#F5F0EA] flex items-center justify-center p-12 md:p-20 min-h-[440px]">
          <div className="text-center max-w-xs">
            <p className="text-muted text-xs uppercase tracking-widest mb-4">{t('home.editorial1.label')}</p>
            <h2 className="font-serif text-4xl md:text-5xl italic font-light mb-6 leading-tight">
              {t('home.editorial1.tagline')}
            </h2>
            <Link
              to="/shop"
              className="text-xs uppercase tracking-widest border-b border-dark pb-0.5 hover:text-gold hover:border-gold transition-colors"
            >
              {t('home.editorial1.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Editorial 2 */}
      <section className="grid md:grid-cols-2">
        <div className="bg-[#EAE8E4] flex items-center justify-center p-12 md:p-20 min-h-[440px] order-2 md:order-1">
          <div className="text-center max-w-xs">
            <p className="text-muted text-xs uppercase tracking-widest mb-4">{t('home.editorial2.label')}</p>
            <h2 className="font-serif text-4xl md:text-5xl italic font-light mb-6 leading-tight">
              {t('home.editorial2.tagline')}
            </h2>
            <Link
              to="/shop"
              className="text-xs uppercase tracking-widest border-b border-dark pb-0.5 hover:text-gold hover:border-gold transition-colors"
            >
              {t('home.editorial2.cta')}
            </Link>
          </div>
        </div>
        <div className="bg-[#D0CCC8] min-h-[440px] flex items-center justify-center order-1 md:order-2">
          <p className="text-muted text-xs uppercase tracking-widest">{t('home.hero.imagePlaceholder')}</p>
        </div>
      </section>
    </div>
  );
}
