import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import type { ItemView } from '../../types';
import { pickLocale } from '../../types';

function effectivePrice(price: number, discountPercent: number | null): number {
  if (!discountPercent) return price;
  return price * (1 - discountPercent / 100);
}

export default function ProductCard({ item }: { item: ItemView }) {
  const { t, i18n } = useTranslation();
  const { addItem } = useCart();
  const { format } = useCurrency();
  const name = pickLocale(item.nameEn, item.nameFr, item.nameEs, i18n.language);
  const salePrice = effectivePrice(Number(item.price), item.discountPercent);
  const hasDiscount = !!item.discountPercent;

  const assets = item.assets ?? [];
  const hasMultiple = assets.length > 1;
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAsset = assets[index] ?? null;

  function resetInterval() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!hasMultiple) return;
    intervalRef.current = setInterval(() => {
      setIndex(i => (i + 1) % assets.length);
    }, 10000);
  }

  useEffect(() => {
    resetInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goPrev(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIndex(i => (i - 1 + assets.length) % assets.length);
    resetInterval();
  }

  function goNext(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIndex(i => (i + 1) % assets.length);
    resetInterval();
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem({ id: item.id, name, price: salePrice, quantity: 1, imageUrl: assets[0]?.imageUrl ?? null, resourceType: assets[0]?.resourceType });
  }

  return (
    <Link to={`/shop/${item.id}`} className="group block">
      <div className="relative bg-[#F0EDE8] aspect-square overflow-hidden mb-3">
        {/* Current asset */}
        {currentAsset ? (
          currentAsset.resourceType === 'video' ? (
            <video
              key={currentAsset.id}
              src={currentAsset.imageUrl ?? undefined}
              className="w-full h-full object-cover"
              muted
              autoPlay
              loop
              playsInline
            />
          ) : (
            <img
              src={currentAsset.imageUrl ?? ''}
              alt={name}
              className={`w-full h-full object-cover transition-transform duration-500 ${!hasMultiple ? 'group-hover:scale-105' : ''}`}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs uppercase tracking-widest">
            {item.category}
          </div>
        )}

        {/* Carousel arrows — visible on hover when multiple assets */}
        {hasMultiple && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-dark w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              onClick={goNext}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-dark w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              aria-label="Next"
            >
              ›
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1 pointer-events-none">
              {assets.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${i === index ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Quick add — slides up on hover */}
        <button
          onClick={handleAddToCart}
          className="absolute bottom-0 left-0 right-0 bg-dark text-white text-xs uppercase tracking-widest py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 cursor-pointer"
        >
          {t('product.addToCart')}
        </button>
      </div>
      <p className="text-sm tracking-wide">{name}</p>
      {hasDiscount ? (
        <p className="text-sm mt-0.5 flex items-center gap-2">
          <span>{format(salePrice)}</span>
          <span className="line-through text-muted">{format(Number(item.price))}</span>
          <span className="text-xs text-gold">-{item.discountPercent}%</span>
        </p>
      ) : (
        <p className="text-sm text-muted mt-0.5">{format(Number(item.price))}</p>
      )}
    </Link>
  );
}
