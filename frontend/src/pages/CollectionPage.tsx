import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import ProductCard from '../components/ui/ProductCard';
import type { CollectionView, CollectionSiteAssetView, ItemView, CategoryView } from '../types';
import { pickLocale } from '../types';
import { useTheme, THEME_DEFAULTS } from '../context/ThemeContext';

type SortOption = 'default' | 'bestselling' | 'price_asc' | 'price_desc';

const effectivePrice = (item: ItemView) =>
  item.discountPercent ? item.price * (1 - item.discountPercent / 100) : item.price;

type AssetEntry = {
  url: string | null; resourceType: string;
  headerEn: string | null; headerFr: string | null; headerEs: string | null;
  subheaderEn: string | null; subheaderFr: string | null; subheaderEs: string | null;
  color: string | null;
  ctaCategory: string | null; ctaLabelId: number | null;
};

function fromSiteAsset(a: CollectionSiteAssetView | undefined): AssetEntry | undefined {
  if (!a) return undefined;
  return {
    url: a.imageUrl, resourceType: a.resourceType,
    headerEn: a.headerEn, headerFr: a.headerFr, headerEs: a.headerEs,
    subheaderEn: a.subheaderEn, subheaderFr: a.subheaderFr, subheaderEs: a.subheaderEs,
    color: a.color, ctaCategory: a.ctaCategory, ctaLabelId: a.ctaLabelId,
  };
}

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
    return <video src={entry.url} className={`${className} object-top md:object-center`} autoPlay muted loop playsInline />;
  }
  return <img src={entry.url} alt={alt} className={className} />;
}

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const collectionId = Number(id);
  const { theme: globalTheme, setTheme } = useTheme();
  const savedTheme = useRef(globalTheme);

  const [collection, setCollection] = useState<CollectionView | null>(null);
  const [trending, setTrending] = useState<ItemView[]>([]);
  const [allItems, setAllItems] = useState<ItemView[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOption>('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(collectionId)) { navigate('/collections', { replace: true }); return; }

    setLoading(true);
    Promise.all([
      api.collections.getById(collectionId),
      api.collections.trending(collectionId),
      api.collections.items(collectionId),
    ])
      .then(([col, tr, items]) => {
        setCollection(col);
        setTrending(tr);
        setAllItems(items);
      })
      .catch(() => navigate('/collections', { replace: true }))
      .finally(() => setLoading(false));
  }, [collectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply collection theme on mount, restore global on unmount
  useEffect(() => {
    savedTheme.current = globalTheme;
    if (collection?.theme) {
      const merged = { ...THEME_DEFAULTS, ...globalTheme };
      const t = collection.theme;
      if (t.navbarBg) merged.navbarBg = t.navbarBg;
      if (t.navbarText) merged.navbarText = t.navbarText;
      if (t.navbarTextSelected) merged.navbarTextSelected = t.navbarTextSelected;
      if (t.navbarTextInactive) merged.navbarTextInactive = t.navbarTextInactive;
      if (t.announcementBg) merged.announcementBg = t.announcementBg;
      if (t.announcementText) merged.announcementText = t.announcementText;
      if (t.siteBg) merged.siteBg = t.siteBg;
      if (t.siteText) merged.siteText = t.siteText;
      if (t.cardText) merged.cardText = t.cardText;
      if (t.cardButtonBg) merged.cardButtonBg = t.cardButtonBg;
      if (t.cardButtonText) merged.cardButtonText = t.cardButtonText;
      if (t.navbarSeparator) merged.navbarSeparator = t.navbarSeparator;
      if (t.siteTextMuted) merged.siteTextMuted = t.siteTextMuted;
      if (t.siteTextAccent) merged.siteTextAccent = t.siteTextAccent;
      if (t.siteSeparator) merged.siteSeparator = t.siteSeparator;
      setTheme(merged);
    }
    return () => { setTheme(savedTheme.current); };
  }, [collection?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const assetMap = useMemo(() => {
    const map: Record<string, CollectionSiteAssetView> = {};
    collection?.siteAssets.forEach(a => { map[a.slot] = a; });
    return map;
  }, [collection]);

  const hero = fromSiteAsset(assetMap.hero);
  const ed1 = fromSiteAsset(assetMap.editorial1);
  const ed2 = fromSiteAsset(assetMap.editorial2);

  // Unique categories present in collection items
  const categories = useMemo<CategoryView[]>(() => {
    const seen = new Map<number, CategoryView>();
    allItems.forEach(item => {
      if (!seen.has(item.category.id)) seen.set(item.category.id, item.category);
    });
    return Array.from(seen.values());
  }, [allItems]);

  const filteredItems = useMemo(() => {
    let result = allItems;
    if (activeCategory !== null) {
      result = result.filter(item => item.category.id === activeCategory);
    }
    if (sort === 'price_asc') return [...result].sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sort === 'price_desc') return [...result].sort((a, b) => effectivePrice(b) - effectivePrice(a));
    if (sort === 'bestselling') return [...result].sort((a, b) => b.price - a.price); // server already sorted, keep order
    return result;
  }, [allItems, activeCategory, sort]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-[55vh] bg-[#F0EDE8]" />
        </div>
      </div>
    );
  }

  if (!collection) return null;

  const collectionName = pickLocale(collection.headerEn, collection.headerFr, collection.headerEs, i18n.language);

  return (
    <div>
      {/* Hero */}
      <section className="relative w-full h-[55vh] md:h-[85vh] bg-[#D8D4CC] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {hero?.url
            ? <SlotMedia entry={hero} alt={collectionName || 'Collection'} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted text-sm uppercase tracking-widest">{collectionName}</p>
              </div>
          }
        </div>
        <div className="relative z-10 p-10 md:p-16 max-w-lg" style={hero?.color ? { color: hero.color } : undefined}>
          <h1 className="font-serif text-5xl md:text-6xl italic font-light leading-tight mb-6">
            {pickLocale(hero?.headerEn, hero?.headerFr, hero?.headerEs, i18n.language) || collectionName}
          </h1>
          {(hero?.subheaderEn || hero?.subheaderFr || hero?.subheaderEs) && (
            <p className="text-sm uppercase tracking-widest mb-4">
              {pickLocale(hero?.subheaderEn, hero?.subheaderFr, hero?.subheaderEs, i18n.language)}
            </p>
          )}
          {(hero?.ctaCategory || hero?.ctaLabelId != null) && (
            <Link
              to={ctaHref(hero)}
              className="inline-block border px-10 py-3 text-xs uppercase tracking-widest hover:opacity-75 transition-opacity"
              style={hero?.color ? { borderColor: hero.color } : { borderColor: '#1C1C1C' }}
            >
              {t('home.hero.cta')}
            </Link>
          )}
        </div>
      </section>

      {/* Trending from this collection */}
      {trending.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-serif text-3xl font-light">{t('home.trending.title')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trending.map(item => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Products section */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        {/* Category filters + sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-1.5 text-xs uppercase tracking-widest border transition-colors ${activeCategory === null ? 'bg-dark text-light border-dark' : 'border-current hover:opacity-70'}`}
            >
              {t('shop.all')}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 text-xs uppercase tracking-widest border transition-colors ${activeCategory === cat.id ? 'bg-dark text-light border-dark' : 'border-current hover:opacity-70'}`}
              >
                {pickLocale(cat.nameEn, cat.nameFr, cat.nameEs, i18n.language)}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="text-xs uppercase tracking-widest border border-current bg-transparent px-3 py-1.5 cursor-pointer"
          >
            <option value="default">{t('shop.sortDefault')}</option>
            <option value="bestselling">{t('shop.sortBestselling')}</option>
            <option value="price_asc">{t('shop.sortPriceAsc')}</option>
            <option value="price_desc">{t('shop.sortPriceDesc')}</option>
          </select>
        </div>

        {filteredItems.length === 0 ? (
          <p className="text-muted text-center py-16">{t('shop.noProducts')}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {filteredItems.map(item => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Editorial 1 */}
      <section className="grid md:grid-cols-2">
        <div className="bg-[#E0DDD8] min-h-[440px] overflow-hidden">
          {ed1?.url
            ? <SlotMedia entry={ed1} alt="Editorial 1" className="w-full h-full object-cover" />
            : <div className="w-full h-full min-h-[440px] flex items-center justify-center">
                <p className="text-muted text-xs uppercase tracking-widest">{t('home.editorial1.imagePlaceholder')}</p>
              </div>
          }
        </div>
        <div className="bg-[#F5F0EA] flex items-center justify-center p-12 md:p-20 min-h-[440px]">
          <div className="text-center max-w-xs" style={ed1?.color ? { color: ed1.color } : undefined}>
            <p className="text-xs uppercase tracking-widest mb-4">
              {pickLocale(ed1?.subheaderEn, ed1?.subheaderFr, ed1?.subheaderEs, i18n.language) || t('home.editorial1.label')}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl italic font-light mb-6 leading-tight">
              {pickLocale(ed1?.headerEn, ed1?.headerFr, ed1?.headerEs, i18n.language) || t('home.editorial1.tagline')}
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
            <p className="text-xs uppercase tracking-widest mb-4">
              {pickLocale(ed2?.subheaderEn, ed2?.subheaderFr, ed2?.subheaderEs, i18n.language) || t('home.editorial2.label')}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl italic font-light mb-6 leading-tight">
              {pickLocale(ed2?.headerEn, ed2?.headerFr, ed2?.headerEs, i18n.language) || t('home.editorial2.tagline')}
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
            : <div className="w-full h-full min-h-[440px] flex items-center justify-center">
                <p className="text-muted text-xs uppercase tracking-widest">{t('home.editorial2.imagePlaceholder')}</p>
              </div>
          }
        </div>
      </section>
    </div>
  );
}
