import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CartItem } from '../types';

// A cart line is identified by item + chosen size, so the same product in two
// sizes lives as two separate lines.
// eslint-disable-next-line react-refresh/only-export-components
export function cartLineKey(i: { id: number; sizeId?: number | null }): string {
  return `${i.id}:${i.sizeId ?? ''}`;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  function addItem(item: CartItem) {
    setItems(prev => {
      const key = cartLineKey(item);
      const existing = prev.find(i => cartLineKey(i) === key);
      if (existing) {
        return prev.map(i => cartLineKey(i) === key ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
  }

  function removeItem(key: string) {
    setItems(prev => prev.filter(i => cartLineKey(i) !== key));
  }

  function updateQuantity(key: string, quantity: number) {
    if (quantity <= 0) return removeItem(key);
    setItems(prev => prev.map(i => cartLineKey(i) === key ? { ...i, quantity } : i));
  }

  function clear() {
    setItems([]);
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
