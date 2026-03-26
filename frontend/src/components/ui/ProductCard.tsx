import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../context/CartContext';
import type { ItemView } from '../../types';

export default function ProductCard({ item }: { item: ItemView }) {
  const { t } = useTranslation();
  const { addItem } = useCart();

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem({ id: item.id, name: item.name, price: item.price, quantity: 1, imageUrl: item.imageUrl });
  }

  return (
    <Link to={`/shop/${item.id}`} className="group block">
      {/* Image */}
      <div className="relative bg-[#F0EDE8] aspect-square overflow-hidden mb-3">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs uppercase tracking-widest">
            {item.category}
          </div>
        )}
        {/* Quick add — slides up on hover */}
        <button
          onClick={handleAddToCart}
          className="absolute bottom-0 left-0 right-0 bg-dark text-white text-xs uppercase tracking-widest py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 cursor-pointer"
        >
          {t('product.addToCart')}
        </button>
      </div>
      <p className="text-sm tracking-wide">{item.name}</p>
      <p className="text-sm text-muted mt-0.5">${Number(item.price).toFixed(2)}</p>
    </Link>
  );
}
