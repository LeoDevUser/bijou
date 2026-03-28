import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import ProductCard from '../components/ui/ProductCard';
import type { ItemView, SiteAssetView } from '../types';

const CATEGORIES = [
  { key: 'home.categories.rings', value: 'RINGS', slot: 'ring' },
  { key: 'home.categories.necklaces', value: 'NECKLACES', slot: 'necklace' },
  { key: 'home.categories.earrings', value: 'EARRINGS', slot: 'earring' },
  { key: 'home.categories.bracelets', value: 'BRACELETS', slot: 'bracelet' },
] as const;

type AssetEntry = {
  url: string | null; resourceType: string;
  header: string | null; subheader: string | null; color: string | null;
  ctaCategory: string | null; ctaLabelId: number | null;
};

function ctaHref(entry: AssetEntry | undefined): string {
  if (!entry) return '/shop';
  const params = new URLSearchParams();
  if (entry.ctaCategory) params.set('category', entry.ctaCategory);
  if (entry.ctaLabelId != null) params.set('label', String(entry.ctaLabelId));
  const qs = params.toString();
  return qs ? `/shop?${qs}` : '/shop';
}

function SlotMedia({ entry, alt, className }: { entry: AssetEntry; alt: string; className: string }) {
  if (!entry.url) return null;
  if (entry.resourceType === 'video') {
    return <video src={entry.url} className={className} autoPlay muted loop playsInline />;
  }
  return <img src={entry.url} alt={alt} className={className} />;
}

export default function Home() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ItemView[]>([]);
  const [assetMap, setAssetMap] = useState<Record<string, AssetEntry>>({});

  useEffect(() => {
    api.items.list().then(setItems).catch(console.error);
    api.siteAssets.list()
      .then((list: SiteAssetView[]) => {
        const map: Record<string, AssetEntry> = {};
        list.forEach(a => {
          map[a.slot] = { url: a.imageUrl, resourceType: a.resourceType, header: a.header, subheader: a.subheader, color: a.color, ctaCategory: a.ctaCategory, ctaLabelId: a.ctaLabelId };
        });
        setAssetMap(map);
      })
      .catch(console.error);
  }, []);

  const hero = assetMap.hero;
  const ed1 = assetMap.editorial1;
  const ed2 = assetMap.editorial2;

  return (
    <div>
      {/* Hero */}
      <section className="relative w-full h-[85vh] bg-[#D8D4CC] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {hero?.url
            ? <SlotMedia entry={hero} alt="Hero" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><p className="text-muted text-sm uppercase tracking-widest">{t('home.hero.imagePlaceholder')}</p></div>
          }
        </div>
        <div className="relative z-10 p-10 md:p-16 max-w-lg" style={hero?.color ? { color: hero.color } : undefined}>
          <h1 className="font-serif text-5xl md:text-6xl italic font-light leading-tight mb-6">
            {hero?.header || t('home.hero.tagline')}
          </h1>
          {hero?.subheader && (
            <p className="text-sm uppercase tracking-widest mb-4">{hero.subheader}</p>
          )}
          <Link
            to="/shop"
            className="inline-block border px-10 py-3 text-xs uppercase tracking-widest hover:opacity-75 transition-opacity"
            style={hero?.color ? { borderColor: hero.color } : { borderColor: '#1C1C1C' }}
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
          {CATEGORIES.map(cat => {
            const entry = assetMap[cat.slot];
            return (
              <Link key={cat.key} to={`/shop?category=${cat.value}`} className="group block">
                <div className="bg-[#F0EDE8] aspect-square mb-3 overflow-hidden group-hover:bg-[#E8E4DC] transition-colors">
                  {entry?.url
                    ? <SlotMedia entry={entry} alt={t(cat.key)} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><span className="text-muted text-xs uppercase tracking-widest">{t(cat.key)}</span></div>
                  }
                </div>
                <p className="text-center text-xs uppercase tracking-widest">{t(cat.key)}</p>
              </Link>
            );
          })}
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
        <div className="bg-[#E0DDD8] min-h-[440px] overflow-hidden">
          {ed1?.url
            ? <SlotMedia entry={ed1} alt="Editorial 1" className="w-full h-full object-cover" />
            : <div className="w-full h-full min-h-[440px] flex items-center justify-center"><p className="text-muted text-xs uppercase tracking-widest">{t('home.hero.imagePlaceholder')}</p></div>
          }
        </div>
        <div className="bg-[#F5F0EA] flex items-center justify-center p-12 md:p-20 min-h-[440px]">
          <div className="text-center max-w-xs" style={ed1?.color ? { color: ed1.color } : undefined}>
            <p className="text-xs uppercase tracking-widest mb-4">{ed1?.subheader || t('home.editorial1.label')}</p>
            <h2 className="font-serif text-4xl md:text-5xl italic font-light mb-6 leading-tight">
              {ed1?.header || t('home.editorial1.tagline')}
            </h2>
            <Link
              to={ctaHref(ed1)}
              className="text-xs uppercase tracking-widest border-b pb-0.5 hover:opacity-75 transition-opacity"
              style={ed1?.color ? { borderColor: ed1.color } : { borderColor: '#1C1C1C' }}
            >
              {t('home.editorial1.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Editorial 2 */}
      <section className="grid md:grid-cols-2">
        <div className="bg-[#EAE8E4] flex items-center justify-center p-12 md:p-20 min-h-[440px] order-2 md:order-1">
          <div className="text-center max-w-xs" style={ed2?.color ? { color: ed2.color } : undefined}>
            <p className="text-xs uppercase tracking-widest mb-4">{ed2?.subheader || t('home.editorial2.label')}</p>
            <h2 className="font-serif text-4xl md:text-5xl italic font-light mb-6 leading-tight">
              {ed2?.header || t('home.editorial2.tagline')}
            </h2>
            <Link
              to={ctaHref(ed2)}
              className="text-xs uppercase tracking-widest border-b pb-0.5 hover:opacity-75 transition-opacity"
              style={ed2?.color ? { borderColor: ed2.color } : { borderColor: '#1C1C1C' }}
            >
              {t('home.editorial2.cta')}
            </Link>
          </div>
        </div>
        <div className="bg-[#D0CCC8] min-h-[440px] overflow-hidden order-1 md:order-2">
          {ed2?.url
            ? <SlotMedia entry={ed2} alt="Editorial 2" className="w-full h-full object-cover" />
            : <div className="w-full h-full min-h-[440px] flex items-center justify-center"><p className="text-muted text-xs uppercase tracking-widest">{t('home.hero.imagePlaceholder')}</p></div>
          }
        </div>
      </section>
    </div>
  );
}
