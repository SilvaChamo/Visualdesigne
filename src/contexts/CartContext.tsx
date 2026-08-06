'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type CartItem = {
  id: string;
  type: 'domain' | 'hosting' | 'ssl' | 'email';
  name: string;
  price: number;
  period: number; // in years
  renewPrice?: number;
  /** Só presente numa transferência de domínio (não um registo novo) — código EPP. */
  authCode?: string;
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  /** Muda o período (anos) de um item já no carrinho — usado pelo selector de
   * anos de domínios no carrinho/checkout. O preço vem já recalculado por
   * quem chama (ver domainRegistrationPriceMt), nunca recalculado aqui. */
  updateItemPeriod: (id: string, period: number, price: number) => void;
  clearCart: () => void;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load from local storage on init
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vd_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load cart from local storage", e);
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('vd_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      // Prevent duplicates based on name/type
      if (prev.find(i => i.name === item.name && i.type === item.type)) {
        return prev;
      }
      return [...prev, item];
    });
    // Removed setIsCartOpen(true) to keep user on the page
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter(item => item.id !== id));
  };

  const updateItemPeriod = (id: string, period: number, price: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, period, price } : item)));
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((acc, item) => acc + item.price, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateItemPeriod, clearCart, total, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
