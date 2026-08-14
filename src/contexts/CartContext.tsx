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
  /** #6: domínio a que esta hospedagem se destina — nunca derivar do `name`
   * (nome comercial do plano, ex. "Alojamento Web Básico"), que não é um
   * domínio válido e faz a activação no DirectAdmin falhar sempre. Pedido no
   * checkout antes de deixar pagar. */
  hostingDomain?: string;
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  /** Muda o período (anos) de um item já no carrinho — usado pelo selector de
   * anos de domínios no carrinho/checkout. O preço vem já recalculado por
   * quem chama (ver domainRegistrationPriceMt), nunca recalculado aqui. */
  updateItemPeriod: (id: string, period: number, price: number) => void;
  /** #6: define o domínio de destino de um item de hospedagem já no carrinho. */
  updateItemHostingDomain: (id: string, hostingDomain: string) => void;
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
    // 🔒 EM PAUSA (14 ago 2026) — venda de hospedagem desligada de propósito,
    // ordem explícita do utilizador. Não é bug: a gestão de contas de
    // hospedagem já existentes continua a funcionar normalmente, só a COMPRA
    // de hospedagem nova fica bloqueada até se concluir e confirmar o
    // fluxo de Domínios de ponta a ponta primeiro (ver plano combinado —
    // Domínios → Hospedagem → E-mail, um de cada vez). Bloqueado aqui, num
    // único sítio central, em vez de em cada botão espalhado pelo site, para
    // garantir que nenhum caminho escapa. Não remover sem ordem explícita.
    if (item.type === 'hosting') {
      alert('A contratação de hospedagem está temporariamente indisponível — a equipa está a concluir esta funcionalidade.');
      return;
    }
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

  const updateItemHostingDomain = (id: string, hostingDomain: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, hostingDomain } : item)));
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((acc, item) => acc + item.price, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateItemPeriod, updateItemHostingDomain, clearCart, total, isCartOpen, setIsCartOpen }}>
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
