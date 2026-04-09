import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import type { ItemView } from '../types';
import { pickLocale } from '../types';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { addItem } = useCart();
  const { format } = useCurrency();
  const [item, setItem] = useState<ItemView | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [assetIndex, setAssetIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    api.items.get(Number(id))
      .then(data => { setItem(data); setAssetIndex(0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const assets = item?.assets ?? [];
  const hasMultiple = assets.length > 1;
  const currentAsset = assets[assetIndex] ?? null;

  function resetInterval(len: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (len <= 1) return;
    intervalRef.current = setInterval(() => {
      setAssetIndex(i => (i + 1) % len);
    }, 10000);
  }

  useEffect(() => {
    resetInterval(assets.length);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length]);

  const name = item ? pickLocale(item.nameEn, item.nameFr, item.nameEs, i18n.language) : '';
  const description = item ? pickLocale(item.descriptionEn, item.descriptionFr, item.descriptionEs, i18n.language) : '';

  const hasDiscount = !!item?.discountPercent;
  const salePrice = item ? (hasDiscount ? Number(item.price) * (1 - item.discountPercent! / 100) : Number(item.price)) : 0;

  function goTo(i: number) {
    setAssetIndex(i);
    resetInterval(assets.length);
  }

  function goPrev() {
    setAssetIndex(i => (i - 1 + assets.length) % assets.length);
    resetInterval(assets.length);
  }

  function goNext() {
    setAssetIndex(i => (i + 1) % assets.length);
    resetInterval(assets.length);
  }

  function handleAddToCart() {
    if (!item) return;
    addItem({ id: item.id, name, price: salePrice, quantity: 1, imageUrl: assets[0]?.imageUrl ?? null, resourceType: assets[0]?.resourceType });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12">
        <div className="bg-[#F0EDE8] aspect-square animate-pulse" />
        <div className="space-y-4 pt-4">
          <div className="h-4 bg-[#F0EDE8] w-1/4 rounded animate-pulse" />
          <div className="h-8 bg-[#F0EDE8] w-2/3 rounded animate-pulse" />
          <div className="h-6 bg-[#F0EDE8] w-1/5 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!item) {
    return <p className="text-center py-24 text-muted">Product not found.</p>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid md:grid-cols-2 gap-12">
        {/* Carousel */}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="relative bg-[#F0EDE8] aspect-square overflow-hidden">
            {currentAsset ? (
              currentAsset.resourceType === 'video' ? (
                <video
                  key={currentAsset.id}
                  src={currentAsset.imageUrl ?? undefined}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img src={currentAsset.imageUrl ?? ''} alt={name} className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted text-sm uppercase tracking-widest">
                {pickLocale(item.category.nameEn, item.category.nameFr, item.category.nameEs, i18n.language)}
              </div>
            )}
            {hasMultiple && (
              <>
                <button
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-dark w-9 h-9 flex items-center justify-center transition-colors cursor-pointer text-xl"
                  aria-label="Previous"
                >‹</button>
                <button
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-dark w-9 h-9 flex items-center justify-center transition-colors cursor-pointer text-xl"
                  aria-label="Next"
                >›</button>
              </>
            )}
          </div>
          {/* Thumbnail strip */}
          {hasMultiple && (
            <div className="flex gap-2 overflow-x-auto w-full min-w-0 pb-1">
              {assets.map((asset, i) => (
                <button
                  key={asset.id}
                  onClick={() => goTo(i)}
                  className={`flex-shrink-0 w-16 h-16 bg-[#F0EDE8] overflow-hidden border-2 transition-colors cursor-pointer ${i === assetIndex ? 'border-dark' : 'border-transparent'}`}
                >
                  {asset.resourceType === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted uppercase tracking-widest">vid</div>
                  ) : (
                    <img src={asset.imageUrl ?? ''} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-widest text-muted mb-2">{pickLocale(item.category.nameEn, item.category.nameFr, item.category.nameEs, i18n.language)}</p>
          <h1 className="font-serif text-4xl md:text-5xl font-light mb-4">{name}</h1>
          {hasDiscount ? (
            <div className="flex items-center gap-3 mb-6">
              <p className="text-xl">{format(salePrice)}</p>
              <p className="text-lg line-through text-muted">{format(Number(item.price))}</p>
              <span className="text-xs uppercase tracking-widest border border-gold text-gold px-2 py-0.5">-{item.discountPercent}%</span>
            </div>
          ) : (
            <p className="text-xl mb-6">{format(Number(item.price))}</p>
          )}

          {item.labels?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {item.labels.map(label => (
                <span key={label.id} className="text-xs uppercase tracking-wider border border-border px-3 py-1">
                  {pickLocale(label.nameEn, label.nameFr, label.nameEs, i18n.language)}
                </span>
              ))}
            </div>
          )}

          <p className="text-[#555] text-sm leading-relaxed mb-8">{description}</p>

          {item.stock === 0 ? (
            <p className="text-xs uppercase tracking-widest text-muted border border-border px-8 py-4 text-center">
              {t('product.outOfStock')}
            </p>
          ) : (
            <button
              onClick={handleAddToCart}
              className={`w-full py-4 text-xs uppercase tracking-widest transition-colors cursor-pointer ${
                added ? 'bg-gold text-white' : 'bg-dark text-white hover:bg-gold'
              }`}
            >
              {added ? t('product.added') : t('product.addToCart')}
            </button>
          )}

          <p className="text-xs text-muted mt-4 text-center">
            {item.stock} {t('product.inStock')}
          </p>
        </div>
      </div>
    </div>
  );
}
