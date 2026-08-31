import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import ProductCard from '../components/ui/ProductCard';
import { CollectionCard } from './Collections';
import AutoplayVideo from '../components/ui/AutoplayVideo';
import { optimizedImageUrl } from '../utils/cloudinary';
import type { CollectionView, CollectionSiteAssetView, ItemView } from '../types';
import { pickLocale } from '../types';
import { useTheme, mergeCollectionTheme } from '../context/ThemeContext';


type AssetEntry = {
  url: string | null; resourceType: string;
  headerEn: string | null; headerFr: string | null; headerEs: string | null;
  subheaderEn: string | null; subheaderFr: string | null; subheaderEs: string | null;
  taglineEn: string | null; taglineFr: string | null; taglineEs: string | null;
  baseTextColor: string | null;
  headerTextColor: string | null; subheaderTextColor: string | null; taglineTextColor: string | null;
  ctaTextColor: string | null; ctaBorderColor: string | null; ctaBgColor: string | null;
  ctaHoverTextColor: string | null; ctaHoverBorderColor: string | null; ctaHoverBgColor: string | null;
  ctaCategoryIds: number[]; ctaLabelIds: number[]; ctaCollectionIds: number[];
};

function fromSiteAsset(a: CollectionSiteAssetView | undefined): AssetEntry | undefined {
  if (!a) return undefined;
  return {
    url: a.imageUrl, resourceType: a.resourceType,
    headerEn: a.headerEn, headerFr: a.headerFr, headerEs: a.headerEs,
    subheaderEn: a.subheaderEn, subheaderFr: a.subheaderFr, subheaderEs: a.subheaderEs,
    taglineEn: a.taglineEn, taglineFr: a.taglineFr, taglineEs: a.taglineEs,
    baseTextColor: a.baseTextColor,
    headerTextColor: a.headerTextColor, subheaderTextColor: a.subheaderTextColor, taglineTextColor: a.taglineTextColor,
    ctaTextColor: a.ctaTextColor, ctaBorderColor: a.ctaBorderColor, ctaBgColor: a.ctaBgColor,
    ctaHoverTextColor: a.ctaHoverTextColor, ctaHoverBorderColor: a.ctaHoverBorderColor, ctaHoverBgColor: a.ctaHoverBgColor,
    ctaCategoryIds: a.ctaCategoryIds, ctaLabelIds: a.ctaLabelIds,
    ctaCollectionIds: a.ctaCollectionIds ?? [],
  };
}

function assetHasCta(entry: AssetEntry | undefined): boolean {
  return !!entry && (entry.ctaCategoryIds.length > 0 || entry.ctaLabelIds.length > 0
    || entry.ctaCollectionIds.length > 0);
}

function ctaHref(entry: AssetEntry | undefined): string {
  if (!entry) return '/shop';
  const params = new URLSearchParams();
  entry.ctaCategoryIds.forEach(id => params.append('category', String(id)));
  entry.ctaLabelIds.forEach(id => params.append('label', String(id)));
  entry.ctaCollectionIds.forEach(id => params.append('collection', String(id)));
  const qs = params.toString();
  return qs ? `/shop?${qs}` : '/shop';
}

type CtaFallback = { text?: string; border?: string; bg?: string };

/**
 * Resting and hover styles for a slot's CTA. Each resting colour falls back to what the
 * caller passes (the slot's own text colour, historically), and each hover colour falls
 * back to its resting value — so a slot with no CTA colours set renders exactly as before.
 * With no hover colour at all, `hover` is null and the button keeps the opacity fade.
 */
function ctaStyles(entry: AssetEntry | undefined, fallback: CtaFallback) {
  const text = entry?.ctaTextColor ?? fallback.text;
  const border = entry?.ctaBorderColor ?? fallback.border;
  const bg = entry?.ctaBgColor ?? fallback.bg;
  const rest: React.CSSProperties = { color: text, borderColor: border, backgroundColor: bg };

  const hoverText = entry?.ctaHoverTextColor;
  const hoverBorder = entry?.ctaHoverBorderColor;
  const hoverBg = entry?.ctaHoverBgColor;
  const hover = (hoverText || hoverBorder || hoverBg)
    ? { color: hoverText ?? text, borderColor: hoverBorder ?? border, backgroundColor: hoverBg ?? bg }
    : null;
  return { rest, hover };
}

/**
 * CTA link that swaps colours on hover. Tailwind can't express `hover:` for colours only
 * known at runtime, so the swap is driven by state; focus mirrors hover for keyboard users.
 */
function CtaLink({ to, className, styles, children }: {
  to: string;
  className: string;
  styles: ReturnType<typeof ctaStyles>;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const active = hovered && styles.hover ? { ...styles.rest, ...styles.hover } : styles.rest;
  return (
    <Link
      to={to}
      className={`${className} transition-colors ${styles.hover ? '' : 'hover:opacity-75 transition-opacity'}`}
      style={active}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {children}
    </Link>
  );
}

function SlotMedia({ entry, alt, className }: { entry: AssetEntry; alt: string; className: string }) {
  if (!entry.url) return null;
  if (entry.resourceType === 'video') {
    return <AutoplayVideo src={entry.url} className={`${className} object-top md:object-center`} />;
  }
  return <img src={optimizedImageUrl(entry.url)} alt={alt} className={className} />;
}

export default function CollectionPage({ id: propId, onError }: { id?: number; onError?: () => void } = {}) {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const collectionId = propId ?? Number(paramId);
  const isEmbedded = propId !== undefined;
  const { theme: globalTheme, setTheme } = useTheme();

  const [collection, setCollection] = useState<CollectionView | null>(null);
  const [trending, setTrending] = useState<ItemView[]>([]);
  const [allItems, setAllItems] = useState<ItemView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(collectionId)) {
      if (isEmbedded) { onError?.(); } else { navigate('/collections', { replace: true }); }
      return;
    }

    setLoading(true);
    Promise.all([
      api.collections.getById(collectionId),
      api.items.trending(),
      api.collections.items(collectionId),
    ])
      .then(([col, tr, items]) => {
        setCollection(col);
        setTrending(tr);
        setAllItems(items);
      })
      .catch(() => { if (isEmbedded) { onError?.(); } else { navigate('/collections', { replace: true }); } })
      .finally(() => setLoading(false));
  }, [collectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply collection theme globally when the collection loads.
  // Reload once per collection navigation so CSS vars re-initialize cleanly.
  // sessionStorage tracks which collection was last reloaded to prevent infinite loops.
  useEffect(() => {
    if (!collection?.theme) return;
    setTheme(mergeCollectionTheme(globalTheme, collection.theme));
    const key = 'bm_last_reloaded_collection';
    const lastReloaded = sessionStorage.getItem(key);
    if (lastReloaded !== String(collection.id)) {
      sessionStorage.setItem(key, String(collection.id));
      const timer = setTimeout(() => window.location.reload(), 200);
      return () => clearTimeout(timer);
    }
  }, [collection?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const assetMap = useMemo(() => {
    const map: Record<string, CollectionSiteAssetView> = {};
    collection?.siteAssets.forEach(a => { map[a.slot] = a; });
    return map;
  }, [collection]);

  const hero = fromSiteAsset(assetMap.hero);
  const ed1 = fromSiteAsset(assetMap.editorial1);
  const ed2 = fromSiteAsset(assetMap.editorial2);
  const ed3 = fromSiteAsset(assetMap.editorial3);
  const ed4 = fromSiteAsset(assetMap.editorial4);


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
  const subcollections = collection.children ?? [];

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
        <div className="relative z-10 p-10 md:p-16 max-w-lg">
          <h1
            className="font-serif text-5xl md:text-6xl italic font-light leading-tight mb-6"
            style={{ color: hero?.headerTextColor ?? hero?.baseTextColor ?? undefined }}
          >
            {pickLocale(hero?.headerEn, hero?.headerFr, hero?.headerEs, i18n.language) || collectionName}
          </h1>
          {(hero?.subheaderEn || hero?.subheaderFr || hero?.subheaderEs) && (
            <p
              className="text-xl uppercase tracking-widest mb-3"
              style={{ color: hero?.subheaderTextColor ?? hero?.baseTextColor ?? undefined }}
            >
              {pickLocale(hero?.subheaderEn, hero?.subheaderFr, hero?.subheaderEs, i18n.language)}
            </p>
          )}
          {(hero?.taglineEn || hero?.taglineFr || hero?.taglineEs) && (
            <p
              className="text-base tracking-wide opacity-80 mb-4"
              style={{ color: hero?.taglineTextColor ?? hero?.baseTextColor ?? undefined }}
            >
              {pickLocale(hero?.taglineEn, hero?.taglineFr, hero?.taglineEs, i18n.language)}
            </p>
          )}
          {assetHasCta(hero) && (
            <CtaLink
              to={ctaHref(hero)}
              className="inline-block border px-10 py-3 text-xs uppercase tracking-widest"
              styles={ctaStyles(hero, { border: hero?.baseTextColor ?? '#1C1C1C' })}
            >
              {t('home.hero.cta')}
            </CtaLink>
          )}
        </div>
      </section>

      {/* Subcollections — rendered as cards, like products, above the item grid */}
      {subcollections.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pt-16">
          <h2 className="font-serif text-3xl font-light mb-10">{t('collections.subcollections')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subcollections.map(child => <CollectionCard key={child.id} c={child} />)}
          </div>
        </section>
      )}

      {/* Products section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-16">
        <p className="text-xs uppercase tracking-widest text-muted mb-10">{collectionName}</p>
        {allItems.length === 0 ? (
          <p className="text-muted text-center py-16">{t('shop.noProducts')}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {allItems.map(item => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Editorials — 2×2 grid */}
      <section className="grid md:grid-cols-2">
        {([ed1, ed2, ed3, ed4] as const).map((ed, i) => {
          const placeholderBg = ['#E0DDD8', '#F5F0EA', '#EAE8E4', '#D0CCC8'][i];
          const header    = pickLocale(ed?.headerEn,    ed?.headerFr,    ed?.headerEs,    i18n.language);
          const subheader = pickLocale(ed?.subheaderEn, ed?.subheaderFr, ed?.subheaderEs, i18n.language);
          const tagline   = pickLocale(ed?.taglineEn,   ed?.taglineFr,   ed?.taglineEs,   i18n.language);
          const hasCta    = assetHasCta(ed);
          const hasText   = header || subheader || (tagline && hasCta);
          const fallbackColor = ed?.url ? '#FFFFFF' : '#1C1C1C';
          const ctaColor  = ed?.taglineTextColor ?? ed?.baseTextColor ?? fallbackColor;
          const ctaStyle  = ctaStyles(ed, { text: ctaColor, border: ctaColor });
          return (
            <div
              key={i}
              className="relative min-h-[440px] overflow-hidden flex items-center justify-center"
              style={{ background: ed?.url ? undefined : placeholderBg }}
            >
              {ed?.url && (
                <SlotMedia entry={ed} alt={`Editorial ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
              )}
              {hasText && (
                <div className="relative z-10 text-center max-w-xs p-8 md:p-12" style={{ color: ed?.baseTextColor ?? fallbackColor }}>
                  {subheader && (
                    <p className="text-xs uppercase tracking-widest mb-4">{subheader}</p>
                  )}
                  {header && (
                    <h2 className="font-serif text-4xl md:text-5xl italic font-light mb-6 leading-tight">{header}</h2>
                  )}
                  {hasCta && (
                    <CtaLink
                      to={ctaHref(ed)}
                      className="inline-block text-xs uppercase tracking-widest border-b pb-0.5"
                      styles={ctaStyle}
                    >
                      {tagline || t('home.editorial1.cta')}
                    </CtaLink>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
    </div>
  );
}
