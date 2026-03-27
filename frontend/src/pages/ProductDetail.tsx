import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import type { ItemView } from '../types';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { addItem } = useCart();
  const [item, setItem] = useState<ItemView | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.items.get(Number(id))
      .then(setItem)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  function handleAddToCart() {
    if (!item) return;
    addItem({ id: item.id, name: item.name, price: item.price, quantity: 1, imageUrl: item.imageUrl });
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
        {/* Image */}
        <div className="bg-[#F0EDE8] aspect-square overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-sm uppercase tracking-widest">
              {item.category}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-widest text-muted mb-2">{item.category}</p>
          <h1 className="font-serif text-4xl md:text-5xl font-light mb-4">{item.name}</h1>
          <p className="text-xl mb-6">${Number(item.price).toFixed(2)}</p>

          {item.labels?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {item.labels.map(label => (
                <span key={label.id} className="text-xs uppercase tracking-wider border border-border px-3 py-1">
                  {label.name}
                </span>
              ))}
            </div>
          )}

          <p className="text-[#555] text-sm leading-relaxed mb-8">{item.description}</p>

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
