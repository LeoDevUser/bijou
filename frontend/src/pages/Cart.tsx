import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';

export default function Cart() {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, total, count } = useCart();
  const { format } = useCurrency();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="font-serif text-4xl font-light mb-4">{t('cart.title')}</h1>
        <p className="text-muted mb-10">{t('cart.empty')}</p>
        <Link
          to="/shop"
          className="inline-block border border-dark text-xs uppercase tracking-widest px-10 py-3 hover:bg-dark hover:text-white transition-colors"
        >
          {t('cart.continueShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-1">{t('cart.title')}</h1>
      <p className="text-muted text-sm mb-10">{count} {t('cart.itemCount')}</p>

      <div className="grid md:grid-cols-[1fr_300px] gap-12">
        {/* Line items */}
        <div className="space-y-6">
          {items.map(item => (
            <div key={item.id} className="flex gap-4 border-b border-border pb-6">
              <Link to={`/shop/${item.id}`} className="w-24 h-24 bg-[#F0EDE8] flex-shrink-0 overflow-hidden">
                {item.imageUrl && (
                  item.resourceType === 'video'
                    ? <video src={item.imageUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                    : <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                )}
              </Link>
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex justify-between">
                  <p className="text-sm tracking-wide">{item.name}</p>
                  <p className="text-sm">{format(item.price * item.quantity)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center border border-border">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-3 py-1 text-sm hover:bg-[#F0EDE8] transition-colors cursor-pointer"
                    >
                      −
                    </button>
                    <span className="px-3 py-1 text-sm border-x border-border">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-1 text-sm hover:bg-[#F0EDE8] transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-xs uppercase tracking-wider text-muted hover:text-dark transition-colors cursor-pointer"
                  >
                    {t('cart.remove')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div>
          <div className="border border-border p-6">
            <h2 className="text-xs uppercase tracking-widest mb-6">{t('cart.summary')}</h2>
            <div className="flex justify-between text-sm mb-3">
              <span>{t('cart.subtotal')}</span>
              <span>{format(total)}</span>
            </div>
            <div className="flex justify-between text-sm mb-6 text-muted">
              <span>{t('cart.shipping')}</span>
              <span>{t('cart.shippingCalculated')}</span>
            </div>
            <div className="border-t border-border pt-4 flex justify-between text-sm font-medium mb-6">
              <span>{t('cart.total')}</span>
              <span>{format(total)}</span>
            </div>
            <Link
              to="/checkout"
              className="block w-full bg-dark text-white text-center text-xs uppercase tracking-widest py-4 hover:bg-gold transition-colors"
            >
              {t('cart.checkout')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
